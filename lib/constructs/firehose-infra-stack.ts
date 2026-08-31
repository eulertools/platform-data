import * as S3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import * as kinesis from 'aws-cdk-lib/aws-kinesis';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as kdf from 'aws-cdk-lib/aws-kinesisfirehose';

export interface FirehoseProps {
  bucket: S3.IBucket;
  stream: kinesis.IStream;
  lambda: lambda.Function;
  prefix: string;
}

export class FirehoseInfraStack extends Construct {
  constructor(scope: Construct, id: string, props: FirehoseProps) {
    super(scope, id);

    const firehoseRole = new iam.Role(this, 'FirehoseRole', {
      assumedBy: new iam.ServicePrincipal('firehose.amazonaws.com'),
    });

    props.stream.grantRead(firehoseRole);
    const grantPermission = props.stream.grant(firehoseRole, 'kinesis:DescribeStream');
    props.bucket.grantReadWrite(firehoseRole);
    props.lambda.grantInvoke(firehoseRole);

    const firehose = new kdf.CfnDeliveryStream(this, 'FirehoseDeliveryStream', {
      deliveryStreamType: 'KinesisStreamAsSource',
      kinesisStreamSourceConfiguration: {
        kinesisStreamArn: props.stream.streamArn,
        roleArn: firehoseRole.roleArn,
      },
      extendedS3DestinationConfiguration: {
        bucketArn: props.bucket.bucketArn,
        bufferingHints: {
          intervalInSeconds: 120,
          sizeInMBs: 128,
        },
        compressionFormat: 'UNCOMPRESSED',
        roleArn: firehoseRole.roleArn,
        prefix: props.prefix,
        processingConfiguration: {
          enabled: true,
          processors: [
            {
              type: 'Lambda',
              parameters: [
                {
                  parameterName: 'LambdaArn',
                  parameterValue: props.lambda.functionArn,
                },
              ],
            },
          ],
        },
      },
    });

    grantPermission.applyBefore(firehose);
  }
}
