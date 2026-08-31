const AWS = require("aws-sdk");
const { pairCreatedMapper } = require("./pairCreatedMapper");
const Web3 = require("web3");

const web3Client = new Web3(process.env.FULL_NODE);

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
          "0x0d3648bd0f6ba80134a33ba9275ac585d9d315f0ad8355cddefde31afa28d0e9",
        ],
      });

      if (logs.length === 0) {
        return {
          body: JSON.stringify({
            message: `No new pairs in this block: ${block.number}`,
          }),
          statusCode: 200,
        };
      }

      const records = logs.map((record) => {
        const { token0, token1, address } = pairCreatedMapper(record);
        return {
          Data: Buffer.from(
            JSON.stringify({
              log_index: record.logIndex,
              address,
              token0,
              token1,
              factory_address: record.address,
            })
          ),
          PartitionKey: `LOGS-${new Date().getTime()}`,
        };
      });

      const pairs = records.map((record) => {
        return {
          Data: Buffer.from(JSON.stringify(record)),
          PartitionKey: `LOGS-${new Date().getTime()}`,
        };
      });

      if (pairs.length > 0) {
        let i, j, logBatch;
        for (i = 0, j = pairs.length; i < j; i += 25) {
          logBatch = pairs.slice(i, i + 25);
          // Create Swap Pool
          client.putRecords(
            {
              Records: logBatch,
              StreamName: process.env.POOLS_STREAM_NAME,
            },
            (err, data) => {
              if (err) {
                console.log({
                  message: "Error Streaming Swap Pool to kinesis",
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
        message: `New Pools Enqueued to kinesis for block`,
        status: "success",
        blockChain: process.env.CHAIN_ID,
        object: "newPools",
        readable_date: new Date(block.timestamp * 1000).toISOString(),
        timestamp: block.timestamp,
        number: block.number,
      });
    }
  } catch (error) {
    console.error({
      message: "Error occured while streaming Swap Pool into kinesis",
      error: JSON.stringify(error),
      status: "error",
      blockChain: process.env.CHAIN_ID,
      object: "logs",
    });
    throw error;
  }

  return {
    body: JSON.stringify({
      message: `Executed Lambda Successfully, Streamed the Sawp Pool and Lp token into kinesis`,
    }),
    statusCode: 200,
  };
};
