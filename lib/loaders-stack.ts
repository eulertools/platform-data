import {App, Stack, StackProps} from "aws-cdk-lib";
import * as kinesis from "aws-cdk-lib/aws-kinesis";

interface LoadersStackProps extends StackProps {
  chain_id: string;
}

export class LoadersStack extends Stack {
  public readonly ddbStream: kinesis.Stream;

  constructor(scope: App, id: string, props?: LoadersStackProps) {
    super(scope, id, props);
  }
}
