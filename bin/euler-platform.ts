#!/usr/bin/env node
import { App } from 'aws-cdk-lib';
import { CollectorStack } from '../lib/collector-stack';
import { PlatformHelpers } from './stacks/platform-helpers';

const app = new App();

new PlatformHelpers(app, 'PlatformHelpers', {
  branchName: 'development',
  description:
    'Includes all helpers the platform need and are shared, like ssm parameters, ' +
    'lambda layers and every other shared resource',
  tags: { usage: 'platform-helper' },
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});

new CollectorStack(app, 'BNBTestnetCollector', {
  chain_id: 'bsc/testnet',
  Marketplace: false,
  NewPair: true,
  SwapEvents: true,
  Transfers: true,
  Syncs: true,
  Bridge: true,
  description: 'Collects all events from an EVM Blockchain streams them',
  tags: { usage: 'data-collector', blockchain: 'bsc' },
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});

new CollectorStack(app, 'AVAXTestnetCollector', {
  chain_id: 'avax/testnet/cchain',
  Marketplace: false,
  NewPair: true,
  SwapEvents: true,
  Transfers: true,
  Syncs: true,
  Bridge: true,
  description: 'Collects all events from an EVM Blockchain streams them',
  tags: { usage: 'data-collector', blockchain: 'avax' },
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});

new CollectorStack(app, 'BNBMainnetCollector', {
  chain_id: 'bsc/mainnet',
  Marketplace: false,
  NewPair: false,
  SwapEvents: false,
  Transfers: false,
  Syncs: false,
  Bridge: false,
  description: 'Collects all events from an EVM Blockchain streams them',
  tags: { usage: 'data-collector', blockchain: 'bsc' },
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});
