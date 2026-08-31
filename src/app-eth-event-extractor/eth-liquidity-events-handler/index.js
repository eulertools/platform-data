const AWS = require("aws-sdk");
const { getPairData } = require("./getPairData");
const Web3 = require("web3");
const _ = require("lodash");

const web3Client = new Web3(process.env.FULL_NODE);

const inputs = [
  {
    indexed: false,
    internalType: "uint112",
    name: "reserve0",
    type: "uint112",
  },
  {
    indexed: false,
    internalType: "uint112",
    name: "reserve1",
    type: "uint112",
  },
];

exports.handler = async (event, context) => {
  const client = new AWS.Kinesis({ region: process.env.AWS_REGION });

  try {
    console.log("Retrieving records from the SQS Queue");
    for (const record of event.Records) {
      const message = JSON.parse(record.body);
      const block = JSON.parse(message.Message);

      const logs = await web3Client.eth.getPastLogs({
        fromBlock: block.number,
        toBlock: block.number,
        topics: [
          "0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1",
        ],
      });

      const syncs = _.chain(logs)
        .orderBy("logIndex", "desc")
        .uniqBy("address")
        .value();

      const records = syncs.map(async (record, index) => {
        try {
          const value = web3Client.eth.abi.decodeLog(inputs, record.data, [
            record.topic1,
            record.topic2,
          ]);

          const pair_data = await getPairData(record.address);

          const data = {
            log_index: record.logIndex,
            address: record.address,
            reserve0: parseInt(value.reserve0),
            reserve1: parseInt(value.reserve1),
            pair_data: pair_data,
            block_timestamp: block.timestamp,
          };
          console.log(JSON.stringify(data));

          return {
            Data: Buffer.from(JSON.stringify(data)),
            PartitionKey: `LOGS-${new Date().getTime()}`,
          };
        } catch (e) {
          console.log({
            message: "error in abi decoder",
            error: [record.address, e],
            blockChain: process.env.CHAIN_ID,
            object: "logs",
          });
          return {};
        }
      });

      const results = await Promise.all(records);

      const mappedLogs = results.filter((el) => el.Data);

      if (mappedLogs.length > 1) {
        let i, j, logBatch;
        for (i = 0, j = mappedLogs.length; i < j; i += 10) {
          logBatch = mappedLogs.slice(i, i + 10);

          client.putRecords(
            {
              Records: logBatch,
              StreamName: process.env.STREAM_NAME,
            },
            (err, data) => {
              if (err) {
                console.log({
                  message: "Error Streaming Liquidity Logs to kinesis",
                  error: JSON.stringify(err),
                  blockChain: process.env.CHAIN_ID,
                  object: "logs",
                });
                throw err;
              }
            }
          );
        }
      }

      console.log({
        message: `Pair Liquidity Events Enqueued to kinesis for block`,
        status: "success",
        blockChain: process.env.CHAIN_ID,
        object: "tokenTransfers",
        readable_date: new Date(block.timestamp * 1000).toISOString(),
        timestamp: block.timestamp,
        number: block.number,
      });
    }
  } catch (error) {
    console.error({
      message:
        "Error occured while streaming Liquidity Logs into kinesis stream",
      error: JSON.stringify(error),
      blockChain: process.env.CHAIN_ID,
      object: "logs",
    });
    throw error;
  }

  return {
    body: JSON.stringify({
      message: `Executed Lambda Successfully, Streamed the Liquidity Logs into kinesis`,
    }),
    statusCode: 200,
  };
};
