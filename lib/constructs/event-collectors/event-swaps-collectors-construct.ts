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

interface SwapCollectorProps extends StackProps {
  chain_id: string;
  blockTopic: sns.Topic;
}

export class SwapEventCollectorConstruct extends Construct {
  constructor(scope: Construct, id: string, props?: SwapCollectorProps) {
    super(scope, id);

    const { chain_id, blockTopic } = props!;

    // Get Secrets
    const sentryDSN = secretsmanager.Secret.fromSecretNameV2(this, 'sentryDSN', 'sentryDSN');

    // Swap Events
    const swapsQueue = new sqs.Queue(this, `Queue`, {
      visibilityTimeout: Duration.seconds(300),
    });

    const SwapsStream = new kinesis.Stream(this, `Stream`, {
      shardCount: 1,
      retentionPeriod: Duration.hours(24),
    });

    blockTopic.addSubscription(new subscriptions.SqsSubscription(swapsQueue));

    const nodejsLayer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      'LayerVersion',
      ssm.StringParameter.fromStringParameterName(this, 'Layer', '/platform/data-collectors/layer/web3')
        .stringValue
    );

    const swapsFunction = new lambda.Function(this, 'Swaps', {
      description: 'Retrieves all swaps events and streams them to be processed',
      memorySize: 512,
      timeout: Duration.seconds(120),
      handler: 'index.handler',
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset(
        path.join(__dirname, `../../../src/app-eth-event-extractor/eth-univ2-swaps-handler`)
      ),
      environment: {
        FULL_NODE: `https://bsc-dataseed.binance.org/`,
        STREAM_NAME: SwapsStream.streamName,
        CHAIN_ID: chain_id,
      },
      layers: [nodejsLayer],
    });

    const swapsFnEventSource = new lambdaEventSources.SqsEventSource(swapsQueue, {
      batchSize: 1,
      enabled: true,
    });

    swapsFunction.addEventSource(swapsFnEventSource);
    SwapsStream.grantWrite(swapsFunction);

    // Create a new SSM Parameter holding a String
    new ssm.StringParameter(this, 'StreamParameterARN', {
      description: 'New UNIv2/v3 pairs Kinesis Stream ARN',
      parameterName: `/pipelines/stream/${chain_id}/Swaps/arn`,
      stringValue: SwapsStream.streamArn,
    });

    // Create a new SSM Parameter holding a String
    new ssm.StringParameter(this, 'StreamParameterName', {
      description: 'New UNIv2/v3 pairs Kinesis Stream ARN',
      parameterName: `/pipelines/stream/${chain_id}/Swaps/name`,
      stringValue: SwapsStream.streamName,
    });
  }
}
