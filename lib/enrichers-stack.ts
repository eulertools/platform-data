import {App, Stack, StackProps} from "aws-cdk-lib";
import * as kinesis from "aws-cdk-lib/aws-kinesis";

interface EnrichersStackProps extends StackProps {
  chain_id: string;
}

export class EnrichersStack extends Stack {
  public readonly ddbStream: kinesis.Stream;

  constructor(scope: App, id: string, props?: EnrichersStackProps) {
    super(scope, id, props);
  }
}
