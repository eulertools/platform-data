import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as kinesis from 'aws-cdk-lib/aws-kinesis';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import { Duration, Fn, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ssm from 'aws-cdk-lib/aws-ssm';

interface SyncCollectorProps extends StackProps {
  chain_id: string;
  catalogDdb: string;
  blockTopic: sns.Topic;
}

export class SyncEventCollectorConstruct extends Construct {
  constructor(scope: Construct, id: string, props?: SyncCollectorProps) {
    super(scope, id);

    const { chain_id, catalogDdb, blockTopic } = props!;

    // Get Secrets
    const sentryDSN = secretsmanager.Secret.fromSecretNameV2(this, 'sentryDSN', 'sentryDSN');

    // Sync Events
    const syncsQueue = new sqs.Queue(this, `Queue`, {
      visibilityTimeout: Duration.seconds(300),
    });

    blockTopic.addSubscription(new subscriptions.SqsSubscription(syncsQueue));

    const SyncsStream = new kinesis.Stream(this, `Stream`, {
      shardCount: 1,
      retentionPeriod: Duration.hours(24),
    });

    const ddbCatalog = dynamodb.Table.fromTableName(this, 'DynamodbCatalog', catalogDdb);

    const fullNode = ssm.StringParameter.valueFromLookup(this, `/providers/nodes/${chain_id}/rpc`);

    const nodejsLayer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      'LayerVersion',
      ssm.StringParameter.fromStringParameterName(this, 'Layer', '/platform/data-collectors/layer/web3')
        .stringValue
    );

    const liquidityFunction = new lambda.Function(this, 'LiquiditySync', {
      description: 'Retrieves all liquidity sync events and streams them to be processed',
      memorySize: 512,
      timeout: Duration.seconds(120),
      handler: 'index.handler',
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset(
        path.join(__dirname, `../../../src/app-eth-event-extractor/eth-liquidity-events-handler`)
      ),
      environment: {
        CATALOG_DDB_TABLE: ddbCatalog.tableName,
        FULL_NODE: fullNode,
        STREAM_NAME: SyncsStream.streamName,
        CHAIN_ID: chain_id,
      },
      layers: [nodejsLayer],
    });

    const liquidityFnEventSource = new lambdaEventSources.SqsEventSource(syncsQueue, {
      batchSize: 1,
      enabled: true,
    });

    liquidityFunction.addEventSource(liquidityFnEventSource);
    SyncsStream.grantWrite(liquidityFunction);
    ddbCatalog.grantReadData(liquidityFunction);

    // Create a new SSM Parameter holding a String
    new ssm.StringParameter(this, 'StreamParameterARN', {
      description: 'New UNIv2/v3 pairs Kinesis Stream ARN',
      parameterName: `/pipelines/stream/${chain_id}/Syncs/arn`,
      stringValue: SyncsStream.streamArn,
    });

    // Create a new SSM Parameter holding a String
    new ssm.StringParameter(this, 'StreamParameterName', {
      description: 'New UNIv2/v3 pairs Kinesis Stream ARN',
      parameterName: `/pipelines/stream/${chain_id}/Syncs/name`,
      stringValue: SyncsStream.streamName,
    });
  }
}
