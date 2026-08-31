import { Duration, Fn, StackProps } from 'aws-cdk-lib';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as kinesis from 'aws-cdk-lib/aws-kinesis';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import * as ssm from 'aws-cdk-lib/aws-ssm';

interface MarketplaceCollectorProps extends StackProps {
  chain_id: string;
  catalogDdb: string;
  blockTopic: sns.Topic;
}

export class MarketplaceEventCollectorConstruct extends Construct {
  constructor(scope: Construct, id: string, props?: MarketplaceCollectorProps) {
    super(scope, id);

    const { blockTopic } = props!;

    const { chain_id } = props!;

    const ddbArn = Fn.importValue('marketplace-database-arn');

    const database = dynamodb.Table.fromTableArn(this, 'MarketPlaceDynamo', ddbArn.toString());

    // Get Secrets
    const sentryDSN = secretsmanager.Secret.fromSecretNameV2(this, 'sentryDSN', 'sentryDSN');

    // New Pairs
    const newSaleQueue = new sqs.Queue(this, `Queue`, {
      visibilityTimeout: Duration.seconds(300),
    });

    blockTopic.addSubscription(new subscriptions.SqsSubscription(newSaleQueue));

    const marketplaceEvents = new kinesis.Stream(this, `Stream`, {
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

    const marketplaceCollector = new lambda.Function(this, 'NewSale', {
      description: 'Retrieves all marketplace new Sales',
      memorySize: 512,
      timeout: Duration.seconds(120),
      handler: 'index.handler',
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset(
        path.join(
          __dirname,
          `../../../src/app-eth-event-extractor/evm-marketplace-events-collector`
        )
      ),
      environment: {
        FULL_NODE: fullNode,
        POOLS_STREAM_NAME: marketplaceEvents.streamName,
        CHAIN_ID: chain_id,
        DATABASE_NAME: database.tableName,
        MARKETPLACE_ADDRESS: '0x89c7a3fcd89fc3b80da5b0629f0a644480117f35',
        TOKEN_INFO_ADDRESS: '0x0e3cd8d5c389967182e07c444b4c309247aaf392',
      },
      layers: [nodejsLayer]
    });

    const newPairFnEventSource = new lambdaEventSources.SqsEventSource(newSaleQueue, {
      batchSize: 1,
      enabled: true,
    });

    marketplaceCollector.addEventSource(newPairFnEventSource);
    marketplaceEvents.grantWrite(marketplaceCollector);
    database.grantReadWriteData(marketplaceCollector);
  }
}
