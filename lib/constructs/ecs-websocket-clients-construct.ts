import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Duration, Fn, StackProps } from 'aws-cdk-lib';
import { EcrEcsPipeline } from './ecr-ecs-pipeline/ecr-ecs-pipeline-construct';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

interface WebSocketClientProps extends StackProps {
  chain_id: string;
  cluster: ecs.Cluster;
}

export class WebSocketClient extends Construct {
  public readonly blocks_queue: sqs.Queue;

  constructor(scope: Construct, id: string, props?: WebSocketClientProps) {
    super(scope, id);

    const { cluster, chain_id } = props!;

    const repositoryName = ssm.StringParameter.fromStringParameterName(
      this,
      'ECRRepo',
      '/repositories/websockets/evm-client'
    ).stringValue;

    // Get Secrets
    const sentryDSN = secretsmanager.Secret.fromSecretNameV2(this, 'sentryDSN', 'sentryDSN');

    const repository = ecr.Repository.fromRepositoryName(this, 'Repository', repositoryName);

    // const bucketName = Fn.importValue('artifact-bucket');

    const bucketName = ssm.StringParameter.fromStringParameterName(this, 'BucketName', `SharedArtifactsBucket`).stringValue
    const bucket = s3.Bucket.fromBucketName(this, 'ArtifactsBucket', bucketName)

    const executionRole = new iam.Role(this, 'TaskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      description: 'Role that the api task definitions use to run the api code',
    });

    const policy = new iam.Policy(this, 'TaskPolicy', {
      statements: [
        // policies to allow access to other AWS services from within the container e.g SES (Simple Email Service)
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['sqs:*', 'logs:*', 'ecr:*', 'iam:*', 'xray:*'],
          resources: ['*'],
        }),
      ],
    });

    executionRole.attachInlinePolicy(policy);

    const taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDef', {
      cpu: 512,
      memoryLimitMiB: 2048,
      taskRole: executionRole,
    });

    const blocksQueue = new sqs.Queue(this, `PendingBlocks`, {
      visibilityTimeout: Duration.seconds(300),
    });

    this.blocks_queue = blocksQueue;

    const nodeWss = ssm.StringParameter.valueFromLookup(this, `/providers/nodes/${chain_id}/wss`);

    const container = taskDefinition.addContainer('WssClient', {
      image: ecs.ContainerImage.fromEcrRepository(repository, 'latest'),
      environment: {
        CHAIN_ID: chain_id,
        MODE: 'blockClient',
        DSN_URL: sentryDSN.secretValue.toString(),
        QUEUE_URL: blocksQueue.queueUrl,
        SQS_ENQUEUER: 'y',
        NODE_WS: nodeWss,
      },
      logging: ecs.LogDriver.awsLogs({ streamPrefix: `logs-client` }),
    });

    const service = new ecs.FargateService(this, 'WssService', {
      cluster,
      desiredCount: 1,
      taskDefinition,
      securityGroups: [],
      assignPublicIp: true,
    });

    const pipeline = new EcrEcsPipeline(this, 'CodePipeline', {
      service: service,
      repository: repository,
      containerName: container.containerName,
      artifactBucket: bucket,
    });
  }
}
