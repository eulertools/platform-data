import * as sns from 'aws-cdk-lib/aws-sns';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as kinesis from 'aws-cdk-lib/aws-kinesis';
import * as path from 'path';
import { KinesisEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { Duration, Fn, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ssm from 'aws-cdk-lib/aws-ssm';

interface BlockValidatorProps extends StackProps {
  chain_id: string;
  dynamodbStream: kinesis.Stream;
  enabled: boolean;
}

export class BlockValidatorConstruct extends Construct {
  public readonly new_block_topic: sns.Topic;

  constructor(scope: Construct, id: string, props?: BlockValidatorProps) {
    super(scope, id);

    const { chain_id, dynamodbStream } = props!;

    // Get Secrets
    const sentryDSN = secretsmanager.Secret.fromSecretNameV2(this, 'sentryDSN', 'sentryDSN');

    const newBlockTopic = new sns.Topic(this, 'Topic');

    this.new_block_topic = newBlockTopic;

    const nodejsLayer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      'LayerVersion',
      ssm.StringParameter.fromStringParameterName(this, 'Layer', '/platform/data-collectors/layer/web3')
        .stringValue
    );

    const blockValidatorFn = new lambda.Function(this, `PreviousBlockValidator`, {
      description: 'Validates image changes in dynamodb and streams it to sns',
      memorySize: 512,
      timeout: Duration.seconds(15),
      handler: 'index.handler',
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset(
        path.join(__dirname, `../../src/app-eth-socket-collector/eth-inserter-sns-blocks`)
      ),
      environment: {
        TOPIC_ARN: newBlockTopic.topicArn,
        CHAIN_ID: chain_id,
      },
      layers: [nodejsLayer],
    });

    blockValidatorFn.addEventSource(
      new KinesisEventSource(dynamodbStream, {
        batchSize: 25,
        startingPosition: lambda.StartingPosition.TRIM_HORIZON,
        bisectBatchOnError: true,
        enabled: props!.enabled,
      })
    );

    newBlockTopic.grantPublish(blockValidatorFn);
  }
}
