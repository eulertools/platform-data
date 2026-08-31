import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as kinesis from 'aws-cdk-lib/aws-kinesis';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import { Duration, Fn, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ssm from 'aws-cdk-lib/aws-ssm';

interface ERC20CollectorProps extends StackProps {
  chain_id: string;
  blockTopic: sns.Topic;
}

export class ERC20EventCollectorConstruct extends Construct {
  constructor(scope: Construct, id: string, props?: ERC20CollectorProps) {
    super(scope, id);

    const { chain_id, blockTopic } = props!;

    // Get Secrets
    const sentryDSN = secretsmanager.Secret.fromSecretNameV2(this, 'sentryDSN', 'sentryDSN');

    const tokenTransfersQueue = new sqs.Queue(this, `Queue`, {
      visibilityTimeout: Duration.seconds(300),
    });

    blockTopic.addSubscription(new subscriptions.SqsSubscription(tokenTransfersQueue));

    const TransfersStream = new kinesis.Stream(this, `Stream`, {
      shardCount: 1,
      retentionPeriod: Duration.hours(24),
    });

    const fullNode = ssm.StringParameter.valueFromLookup(this, `/providers/nodes/${chain_id}/rpc`);

    const nodejsLayer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      'LayerVersion',
      ssm.StringParameter.fromStringParameterName(this, 'Layer', '/platform/data-collectors/layer/web3')
        .stringValue
    );

    const TransfersFunction = new lambda.Function(this, 'Transfer', {
      description: 'Retrieves all token transfers and streams them',
      memorySize: 512,
      timeout: Duration.seconds(120),
      handler: 'index.handler',
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset(
        path.join(__dirname, `../../../src/app-eth-event-extractor/eth-token-transfers-handler`)
      ),
      environment: {
        FULL_NODE: fullNode,
        STREAM_NAME: TransfersStream.streamName,
        CHAIN_ID: chain_id,
      },
      layers: [nodejsLayer]
    });

    const tokenTransfersFnEventSource = new lambdaEventSources.SqsEventSource(tokenTransfersQueue, {
      batchSize: 1,
      enabled: true,
    });

    TransfersFunction.addEventSource(tokenTransfersFnEventSource);
    TransfersStream.grantWrite(TransfersFunction);

    // Create a new SSM Parameter holding a String
    new ssm.StringParameter(this, 'StreamParameterARN', {
      description: 'New UNIv2/v3 pairs Kinesis Stream ARN',
      parameterName: `/pipelines/stream/${chain_id}/transfers/arn`,
      stringValue: TransfersStream.streamArn,
    });

    // Create a new SSM Parameter holding a String
    new ssm.StringParameter(this, 'StreamParameterName', {
      description: 'New UNIv2/v3 pairs Kinesis Stream ARN',
      parameterName: `/pipelines/stream/${chain_id}/transfers/name`,
      stringValue: TransfersStream.streamName,
    });
  }
}
