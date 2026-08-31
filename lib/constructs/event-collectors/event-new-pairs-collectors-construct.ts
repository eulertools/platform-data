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

interface NewPairCollectorProps extends StackProps {
  chain_id: string;
  catalogDdb: string;
  blockTopic: sns.Topic;
}

export class NewPairCollectorConstruct extends Construct {
  constructor(scope: Construct, id: string, props?: NewPairCollectorProps) {
    super(scope, id);

    const { chain_id, blockTopic } = props!;

    // Get Secrets
    const sentryDSN = secretsmanager.Secret.fromSecretNameV2(this, 'sentryDSN', 'sentryDSN');

    const NewPairStream = new kinesis.Stream(this, `Stream`, {
      shardCount: 1,
      retentionPeriod: Duration.hours(24),
    });

    // New Pairs
    const newPairQueue = new sqs.Queue(this, `Queue`, {
      visibilityTimeout: Duration.seconds(300),
    });

    blockTopic.addSubscription(new subscriptions.SqsSubscription(newPairQueue));

    const fullNode = ssm.StringParameter.valueFromLookup(this, `/providers/nodes/${chain_id}/rpc`);

    const nodejsLayer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      'LayerVersion',
      ssm.StringParameter.fromStringParameterName(this, 'Layer', '/platform/data-collectors/layer/web3')
        .stringValue
    );

    const newPairFunction = new lambda.Function(this, 'NewPair', {
      description: 'Retrieves all pair creations from pancake/uniswap clones',
      memorySize: 512,
      timeout: Duration.seconds(120),
      handler: 'index.handler',
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset(
        path.join(__dirname, `../../../src/app-eth-event-extractor/eth-new-pools`)
      ),
      environment: {
        FULL_NODE: fullNode,
        POOLS_STREAM_NAME: NewPairStream.streamName,
        CHAIN_ID: chain_id,
      },
      layers: [nodejsLayer],
    });

    const newPairFnEventSource = new lambdaEventSources.SqsEventSource(newPairQueue, {
      batchSize: 1,
      enabled: true,
    });

    newPairFunction.addEventSource(newPairFnEventSource);
    NewPairStream.grantWrite(newPairFunction);

    // Create a new SSM Parameter holding a String
    new ssm.StringParameter(this, 'StreamParameterARN', {
      description: 'New UNIv2/v3 pairs Kinesis Stream ARN',
      parameterName: `/pipelines/stream/${chain_id}/newPairs/arn`,
      stringValue: NewPairStream.streamArn,
    });

    // Create a new SSM Parameter holding a String
    new ssm.StringParameter(this, 'StreamParameterName', {
      description: 'New UNIv2/v3 pairs Kinesis Stream ARN',
      parameterName: `/pipelines/stream/${chain_id}/newPairs/name`,
      stringValue: NewPairStream.streamName,
    });
  }
}
