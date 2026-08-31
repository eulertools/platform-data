import { Duration, Fn, StackProps } from 'aws-cdk-lib';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import * as sns from 'aws-cdk-lib/aws-sns';

interface AppProps extends StackProps {
  chain_id: string;
  contract_address: string;
  topics: string[];
  blockTopic: sns.Topic;
}

export class BridgeTokenEventCollectorConstruct extends Construct {
  constructor(scope: Construct, id: string, props?: AppProps) {
    super(scope, id);

    const { chain_id, contract_address, topics, blockTopic } = props!;

    // Get Secrets
    const sentryDSN = secretsmanager.Secret.fromSecretNameV2(this, 'sentryDSN', 'sentryDSN');

    const bridgeTableArn = ssm.StringParameter.fromStringParameterName(
      this,
      'TableArn',
      '/directory/table/blockchain-bridge-table-arn'
    );

    const bridgeTable = dynamodb.Table.fromTableArn(this, 'Table', bridgeTableArn.stringValue);

    const walletSecret = secretsmanager.Secret.fromSecretNameV2(
      this,
      'Credentials',
      `evmMinterNft`
    );

    const eventQueue = new sqs.Queue(this, `Queue`, {
      visibilityTimeout: Duration.seconds(300),
    });

    blockTopic.addSubscription(new subscriptions.SqsSubscription(eventQueue));

    const ledgerName = ssm.StringParameter.fromStringParameterName(
      this,
      'QLDBOutput',
      '/platform/qldb/platform-qldb-name'
    ).stringValue;

    const fullNode = ssm.StringParameter.valueFromLookup(this, `/providers/nodes/${chain_id}/rpc`);

    const nodejsLayer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      'LayerVersion',
      ssm.StringParameter.fromStringParameterName(this, 'Layer', '/platform/data-collectors/layer/web3')
        .stringValue
    );

    const bridgeCollector = new lambda.Function(this, `BridgeToken`, {
      description: 'Retrieves all marketplace new Sales',
      memorySize: 512,
      timeout: Duration.seconds(120),
      handler: 'index.handler',
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset(
        path.join(
          __dirname,
          `../../../src/app-eth-event-extractor/evm-bridge-token-events-collector`
        )
      ),
      environment: {
        FULL_NODE: fullNode,
        CHAIN_ID: chain_id,
        CONTRACT_ADDRESS: contract_address,
        TOPICS: JSON.stringify(topics),
        PRIVATE_KEY: walletSecret.secretValueFromJson('privateKey').toString(),
        LEDGER_NAME: ledgerName,
        BRIDGE_TABLE: bridgeTable.tableName,
      },
      layers: [nodejsLayer]
    });

    bridgeCollector.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['qldb:*'],
        effect: iam.Effect.ALLOW,
        resources: ['*'],
      })
    );

    const fnEventSource = new lambdaEventSources.SqsEventSource(eventQueue, {
      batchSize: 1,
      enabled: true,
    });

    bridgeCollector.addEventSource(fnEventSource);
    bridgeTable.grantReadWriteData(bridgeCollector);
  }
}
