import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as path from 'path';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import { KinesisEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { Duration, Fn, StackProps } from 'aws-cdk-lib';
import * as kinesis from 'aws-cdk-lib/aws-kinesis';
import { Construct } from 'constructs';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as iam from 'aws-cdk-lib/aws-iam';

interface EcsDynamoInserterProps extends StackProps {
  chain_id: string;
  chainStatusTable: dynamodb.Table;
  blocksQueue: sqs.Queue;
  dynamodbStream: kinesis.Stream;
}

export class EcsDynamoInserterConstruct extends Construct {
  constructor(scope: Construct, id: string, props?: EcsDynamoInserterProps) {
    super(scope, id);

    const { chain_id, chainStatusTable, blocksQueue, dynamodbStream } = props!;

    // Get Secrets
    const sentryDSN = secretsmanager.Secret.fromSecretNameV2(this, 'sentryDSN', 'sentryDSN');

    const nodejsLayer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      'LayerVersion',
      ssm.StringParameter.fromStringParameterName(this, 'Layer', '/platform/data-collectors/layer/web3').stringValue
    );

    const blocksFunction = new lambda.Function(this, 'BlockInserter', {
      description: 'Retrieve blocks from the queue and inserts them into dynamodb',
      memorySize: 256,
      timeout: Duration.seconds(120),
      handler: 'index.handler',
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset(
        path.join(__dirname, `../../src/app-eth-socket-collector/eth-inserter-dynamo-blocks`)
      ),
      environment: {
        DDB_TABLE: chainStatusTable.tableName,
        CHAIN_ID: chain_id,
      },
      layers: [nodejsLayer],
    });

    const blocksFnEventSource = new lambdaEventSources.SqsEventSource(blocksQueue, {
      batchSize: 10,
      enabled: true,
    });

    chainStatusTable.grantWriteData(blocksFunction);

    blocksFunction.addEventSource(blocksFnEventSource);

    const previousBlockValidatorFn = new lambda.Function(this, `PreviousBlockValidator`, {
      description: 'Validates previous block in dynamodb and re-enqueue it to dynamodb',
      memorySize: 512,
      timeout: Duration.seconds(15),
      handler: 'index.handler',
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset(
        path.join(__dirname, `../../src/app-eth-socket-collector/eth-previous-block-validator`)
      ),
      environment: {
        CHAIN_ID: chain_id,
        DDB_TABLE: chainStatusTable.tableName,
        BLOCK_QUEUE_URL: blocksQueue.queueUrl,
      },
      layers: [nodejsLayer],
    });

    previousBlockValidatorFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        resources: [blocksQueue.queueArn],
        actions: ['*'],
      })
    );

    chainStatusTable.grantReadWriteData(previousBlockValidatorFn);

    previousBlockValidatorFn.addEventSource(
      new KinesisEventSource(dynamodbStream, {
        batchSize: 25,
        startingPosition: lambda.StartingPosition.TRIM_HORIZON,
        bisectBatchOnError: true,
      })
    );
  }
}
