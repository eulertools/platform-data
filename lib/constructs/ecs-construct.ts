import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import {StackProps} from 'aws-cdk-lib';
import {Construct} from "constructs";

interface EcsProps extends StackProps {
  chain_id: string;
}

export class ECSConstruct extends Construct {
  public readonly cluster: ecs.Cluster

  constructor(scope: Construct, id: string, props: EcsProps) {
    super(scope, id);

    const {chain_id} = props!;

    const vpcId = ssm.StringParameter.valueFromLookup(this, '/vpc/vpc/id/VPC').toString()

    //import a parameter from SSM named /vpc/vpc/id/VPC
    const defaultVPC = ec2.Vpc.fromLookup(this, 'VPC', {
      vpcId
    });

    this.cluster = new ecs.Cluster(this, 'Clients', {
      vpc: defaultVPC,
    });

    // Create a new SSM Parameter holding a String
    new ssm.StringParameter(this, 'ClusterParameter', {
      description: `Cluster name for the ${chain_id} collectors`,
      parameterName: `/ecs/cluster/${chain_id}`,
      stringValue: this.cluster.clusterName,
    });
  }
}
