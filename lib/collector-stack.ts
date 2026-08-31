import { BlockchainRawExtractorConstruct } from './constructs/blockchain-raw-extractor-construct';
import { App, Stack, StackProps } from 'aws-cdk-lib';
import { ECSConstruct } from './constructs/ecs-construct';
import { WebSocketClient } from './constructs/ecs-websocket-clients-construct';
import { EcsDynamoInserterConstruct } from './constructs/ecs-dynamo-inserter-construct';
import { BlockValidatorConstruct } from './constructs/block-validators-construct';
import * as kinesis from 'aws-cdk-lib/aws-kinesis';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { ChainFactsCheckerDb } from './constructs/fact-checker-construct-db';
import { MarketplaceEventCollectorConstruct } from './constructs/event-collectors/event-marketplace-collectors-construct';
import { NewPairCollectorConstruct } from './constructs/event-collectors/event-new-pairs-collectors-construct';
import { SwapEventCollectorConstruct } from './constructs/event-collectors/event-swaps-collectors-construct';
import { ERC20EventCollectorConstruct } from './constructs/event-collectors/event-transfers-collectors-construct';
import { SyncEventCollectorConstruct } from './constructs/event-collectors/event-syncs-collectors-construct';
import { BridgeTokenEventCollectorConstruct } from './constructs/event-collectors/event-bridge-token-collectors';

interface CollectorStackProps extends StackProps {
  chain_id: string;
  Marketplace: boolean;
  NewPair: boolean;
  SwapEvents: boolean;
  Transfers: boolean;
  Syncs: boolean;
  Bridge: boolean;
}

export class CollectorStack extends Stack {
  public readonly ddbStream: kinesis.Stream;

  constructor(scope: App, id: string, props?: CollectorStackProps) {
    super(scope, id, props);

    const { chain_id, Marketplace, NewPair, SwapEvents, Transfers, Syncs, Bridge } = props!;

    const cluster = new ECSConstruct(this, 'Cluster', {
      chain_id,
    });

    const collector = new WebSocketClient(this, `SocketClient`, {
      cluster: cluster.cluster,
      chain_id,
    });

    const Ddb = new ChainFactsCheckerDb(this, `DB`, {
      chain_id,
    });

    this.ddbStream = Ddb.dynamo_stream;

    new EcsDynamoInserterConstruct(this, `FactInserter`, {
      chainStatusTable: Ddb.chain_status_table,
      blocksQueue: collector.blocks_queue,
      dynamodbStream: Ddb.dynamo_stream,
      chain_id,
    });

    const validator = new BlockValidatorConstruct(this, `BlockValidator`, {
      enabled: false,
      chain_id,
      dynamodbStream: Ddb.dynamo_stream,
    });

    new BlockchainRawExtractorConstruct(this, `RawData`, {
      chain_id,
      logsShards: 1,
      blocksShards: 1,
      transactionsShards: 1,
      blockTopic: validator.new_block_topic,
      stream: Ddb.dynamo_stream,
      description: `Data Extractors for the ${chain_id} network`,
      tags: { network: chain_id, usage: 'data-collector' },
    });

    if (Marketplace) {
      new MarketplaceEventCollectorConstruct(this, `Marketplace`, {
        chain_id,
        blockTopic: validator.new_block_topic,
        catalogDdb: 'catalog',
      });
    }

    if (NewPair) {
      new NewPairCollectorConstruct(this, `NewPair`, {
        chain_id,
        blockTopic: validator.new_block_topic,
        catalogDdb: 'catalog',
      });
    }

    if (SwapEvents) {
      new SwapEventCollectorConstruct(this, `Swaps`, {
        chain_id,
        blockTopic: validator.new_block_topic,
      });
    }

    if (Transfers) {
      new ERC20EventCollectorConstruct(this, `Transfers`, {
        chain_id,
        blockTopic: validator.new_block_topic,
      });
    }

    if (Syncs) {
      new SyncEventCollectorConstruct(this, `LiquiditySync`, {
        chain_id,
        blockTopic: validator.new_block_topic,
        catalogDdb: 'catalog',
      });
    }

    if (Bridge) {
      const token = ssm.StringParameter.valueFromLookup(this, `/contracts/${chain_id}/token`);

      new BridgeTokenEventCollectorConstruct(this, `BridgeEvents`, {
        chain_id,
        contract_address: token,
        topics: ['0xb509f33ac9a25006937f89b5748ec37f87a87c38e7a864005378f1e88a196de4'],
        blockTopic: validator.new_block_topic,
      });
    }
  }
}
