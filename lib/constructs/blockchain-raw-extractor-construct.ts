import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as kinesis from 'aws-cdk-lib/aws-kinesis';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as path from 'path';
import { Duration, RemovalPolicy, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { FirehoseInfraStack } from './firehose-infra-stack';
import { KinesisEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';

interface CollectorStackProps extends StackProps {
  chain_id: string;
  logsShards: number;
  blocksShards: number;
  transactionsShards: number;
  blockTopic: sns.Topic;
  stream: kinesis.Stream;
}

export class BlockchainRawExtractorConstruct extends Construct {
  constructor(scope: Construct, id: string, props?: CollectorStackProps) {
    super(scope, id);

    const { chain_id, transactionsShards, logsShards, blocksShards, blockTopic, stream } = props!;

    // Get Secrets
    const sentryDSN = secretsmanager.Secret.fromSecretNameV2(this, 'sentryDSN', 'sentryDSN');

    // Block Extractor

    const blockchainDataBucket = new s3.Bucket(this, `BlockchainData`, {
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const BlocksStream = new kinesis.Stream(this, `Blocks`, {
      shardCount: blocksShards,
      retentionPeriod: Duration.hours(24),
    });

    const fullNode = ssm.StringParameter.valueFromLookup(this, `/providers/nodes/${chain_id}/archive/rpc`);

    const web3Layer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      'Web3LayerVersion',
      ssm.StringParameter.fromStringParameterName(this, 'Web3Layer', '/platform/data-collectors/layer/web3').stringValue
    );

    const helpersLayer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      'HelperLayerVersion',
      ssm.StringParameter.fromStringParameterName(this, 'HelperLayer', '/platform/data-collectors/layer/helpers').stringValue
    );

    const blocksFunction = new lambda.Function(this, 'BlockExtractor', {
      code: lambda.Code.fromAsset(
        path.join(__dirname, `../../src/app-eth-blockchain-extractor/eth-extractor-blocks`)
      ),
      description:
        'Retrieves the Blocks, extracts the information from the NODE and streams it to be consumed.',
      memorySize: 512,
      timeout: Duration.seconds(120),
      handler: 'index.handler',
      runtime: lambda.Runtime.NODEJS_14_X,
      environment: {
        FULL_NODE: fullNode,
        STREAM_NAME: BlocksStream.streamName,
        CHAIN_ID: chain_id,
      },
      layers: [web3Layer, helpersLayer],
    });

    const lambdaEvent = new lambda.Function(this, `DataEventS3Handler`, {
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset(path.join(__dirname, `../../src/app-s3-transactions`)),
      timeout: Duration.seconds(120),
      memorySize: 512,
      handler: 'index.handler',
    });

    BlocksStream.grantWrite(blocksFunction);

    blocksFunction.addEventSource(
      new KinesisEventSource(stream, {
        batchSize: 10,
        startingPosition: lambda.StartingPosition.TRIM_HORIZON,
        bisectBatchOnError: true,
        parallelizationFactor: 10
      })
    );

    // Block Extractor

    const logsQueue = new sqs.Queue(this, `LogsQueue`, {
      visibilityTimeout: Duration.seconds(300),
    });

    blockTopic.addSubscription(new subscriptions.SqsSubscription(logsQueue));

    const LogsStream = new kinesis.Stream(this, `Logs`, {
      shardCount: logsShards,
      retentionPeriod: Duration.hours(24),
    });

    const logsFunction = new lambda.Function(this, 'LogsExtractor', {
      description:
        'Retrieves the Logs, extracts the information from the NODE and streams it to be consumed.',
      memorySize: 512,
      timeout: Duration.seconds(120),
      handler: 'index.handler',
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset(
        path.join(__dirname, `../../src/app-eth-blockchain-extractor/eth-extractor-logs`)
      ),
      environment: {
        FULL_NODE: fullNode,
        STREAM_NAME: LogsStream.streamName,
        CHAIN_ID: chain_id,
      },
      layers: [web3Layer, helpersLayer],
    });

    LogsStream.grantWrite(logsFunction);

    logsFunction.addEventSource(
      new KinesisEventSource(stream, {
        batchSize: 10,
        startingPosition: lambda.StartingPosition.TRIM_HORIZON,
        bisectBatchOnError: true,
        parallelizationFactor: 10
      })
    );

    // Transactions extractor

    const transactionsQueue = new sqs.Queue(this, `TransactionsQueue`, {
      visibilityTimeout: Duration.seconds(300),
    });

    blockTopic.addSubscription(new subscriptions.SqsSubscription(transactionsQueue));

    const TransactionsStream = new kinesis.Stream(this, `Transactions`, {
      shardCount: transactionsShards,
      retentionPeriod: Duration.hours(24),
    });

    const transactionsFunction = new lambda.Function(this, 'TxExtractor', {
      description:
        'Retrieves the Transactions, extracts the information from the NODE and streams it to be consumed.',
      memorySize: 512,
      timeout: Duration.seconds(120),
      handler: 'index.handler',
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset(
        path.join(__dirname, `../../src/app-eth-blockchain-extractor/eth-extractor-transactions`)
      ),
      environment: {
        FULL_NODE: fullNode,
        STREAM_NAME: TransactionsStream.streamName,
        CHAIN_ID: chain_id,
      },
      layers: [web3Layer, helpersLayer],
    });

    TransactionsStream.grantWrite(transactionsFunction);

    transactionsFunction.addEventSource(
      new KinesisEventSource(stream, {
        batchSize: 10,
        startingPosition: lambda.StartingPosition.TRIM_HORIZON,
        bisectBatchOnError: true,
        parallelizationFactor: 10
      })
    );

    new FirehoseInfraStack(this, `BlocksFirehose`, {
      bucket: blockchainDataBucket,
      stream: BlocksStream,
      lambda: lambdaEvent,
      prefix: 'kinesis-stream-data-blocks/',
    });

    new FirehoseInfraStack(this, `LogsFirehose`, {
      bucket: blockchainDataBucket,
      stream: LogsStream,
      lambda: lambdaEvent,
      prefix: 'kinesis-stream-data-logs/',
    });

    new FirehoseInfraStack(this, `TransactionFirehose`, {
      bucket: blockchainDataBucket,
      stream: TransactionsStream,
      lambda: lambdaEvent,
      prefix: 'kinesis-stream-data-transactions/',
    });
  }
}
