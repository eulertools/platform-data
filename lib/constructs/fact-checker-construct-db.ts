import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import {Duration, RemovalPolicy, StackProps} from 'aws-cdk-lib';
import * as kinesis from 'aws-cdk-lib/aws-kinesis';
import {Construct} from "constructs";

interface EthBlockchainDbProps extends StackProps {
  chain_id: string;
}

export class ChainFactsCheckerDb extends Construct {
  public readonly chain_status_table: dynamodb.Table;
  public readonly dynamo_stream: kinesis.Stream;

  constructor(scope: Construct, id: string, props?: EthBlockchainDbProps) {
    super(scope, id);

    const dynamodbStream = new kinesis.Stream(this, `Stream`, {
      shardCount: 1,
      retentionPeriod: Duration.hours(24)
    });

    this.dynamo_stream = dynamodbStream;

    this.chain_status_table = new dynamodb.Table(this, `Facts`, {
      partitionKey: {
        name: 'block_number',
        type: dynamodb.AttributeType.NUMBER,
      },
      sortKey: {
        name: 'block_timestamp',
        type: dynamodb.AttributeType.NUMBER,
      },
      billingMode: dynamodb.BillingMode.PROVISIONED,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
      kinesisStream: dynamodbStream,
      removalPolicy: RemovalPolicy.DESTROY,
    });
  }
}
