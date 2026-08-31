import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  LayerConstruct
} from '../../lib/constructs/lambda-layer-construct/lambda-layer-construct';
import * as ssm from 'aws-cdk-lib/aws-ssm';

export interface PipelineStackProps extends StackProps {
  branchName: string;
}

export class PlatformHelpers extends Stack {
  constructor(scope: Construct, id: string, props?: PipelineStackProps) {
    super(scope, id, props);

    const web3Layer = new LayerConstruct(this, 'Web3Layer', {
      prefixPlatform: 'data-collectors',
      layerName: 'web3',
      description: 'Layer utility for web3'
    });

    const snakecaseLayer = new LayerConstruct(this, 'SnakeCaseLayer', {
      prefixPlatform: 'data-collectors',
      layerName: 'helpers',
      description: 'Layer utility for helpers'
    });

    new ssm.StringParameter(this, 'BscTestNodeWss', {
      stringValue: 'wss://bsc-testnet-rpc.publicnode.com',
      parameterName: `/providers/nodes/bsc/testnet/wss`,
    });

    new ssm.StringParameter(this, 'BscTestNodeRpc', {
      stringValue: 'https://bsc-testnet-rpc.publicnode.com',
      parameterName: `/providers/nodes/bsc/testnet/rpc`,
    });

    new ssm.StringParameter(this, 'BscMainnetNodeWss', {
      stringValue: 'wss://bsc-rpc.publicnode.com',
      parameterName: `/providers/nodes/bsc/mainnet/wss`,
    });

    new ssm.StringParameter(this, 'BscMainnetNodeRpc', {
      stringValue: 'https://bsc-dataseed.binance.org/',
      parameterName: `/providers/nodes/bsc/mainnet/rpc`,
    });

    new ssm.StringParameter(this, 'BscMainnetArchiveWss', {
      stringValue: 'wss://bsc-rpc.publicnode.com',
      parameterName: `/providers/nodes/bsc/mainnet/archive/wss`,
    });

    new ssm.StringParameter(this, 'BscMainnetArchiveNodeRpc', {
      stringValue: 'https://bsc-rpc.publicnode.com',
      parameterName: `/providers/nodes/bsc/mainnet/archive/rpc`,
    });

    new ssm.StringParameter(this, 'PolygonTestNodeWss', {
      stringValue: 'wss://polygon-amoy-bor-rpc.publicnode.com',
      parameterName: `/providers/nodes/polygon/testnet/wss`,
    });

    new ssm.StringParameter(this, 'PolygonTestNodeRpc', {
      stringValue: 'https://rpc-amoy.polygon.technology',
      parameterName: `/providers/nodes/polygon/testnet/rpc`,
    });

    new ssm.StringParameter(this, 'AvalancheTestNodeWss', {
      stringValue:
        'wss://api.avax-test.network/ext/bc/C/ws',
      parameterName: `/providers/nodes/avax/testnet/wss`,
    });

    new ssm.StringParameter(this, 'AvalancheTestNodeRpc', {
      stringValue:
        'https://api.avax-test.network/ext/bc/C/rpc',
      parameterName: `/providers/nodes/avax/testnet/rpc`,
    });

    new ssm.StringParameter(this, 'EthTestNodeWss', {
      stringValue: 'wss://ethereum-sepolia-rpc.publicnode.com',
      parameterName: `/providers/nodes/eth/testnet/wss`,
    });

    new ssm.StringParameter(this, 'EthTestNodeRpc', {
      stringValue: 'https://ethereum-sepolia-rpc.publicnode.com',
      parameterName: `/providers/nodes/eth/testnet/rpc`,
    });
  }
}
