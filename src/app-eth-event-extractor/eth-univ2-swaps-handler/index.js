const AWS = require("aws-sdk");
const Web3 = require("web3");

const inputs = [
  {
    indexed: true,
    internalType: "address",
    name: "sender",
    type: "address",
  },
  {
    indexed: false,
    internalType: "uint256",
    name: "amount0In",
    type: "uint256",
  },
  {
    indexed: false,
    internalType: "uint256",
    name: "amount1In",
    type: "uint256",
  },
  {
    indexed: false,
    internalType: "uint256",
    name: "amount0Out",
    type: "uint256",
  },
  {
    indexed: false,
    internalType: "uint256",
    name: "amount1Out",
    type: "uint256",
  },
  {
    indexed: true,
    internalType: "address",
    name: "to",
    type: "address",
  },
];

const web3Client = new Web3(process.env.FULL_NODE);

exports.handler = async (event, context) => {
  const client = new AWS.Kinesis({ region: process.env.AWS_REGION });
  try {
    console.log({ message: "Retrieving records from the SQS Queue" });
    for (const record of event.Records) {
      const message = JSON.parse(record.body);
      const block = JSON.parse(message.Message);

      let swaps;
      try {
        swaps = await web3Client.eth.getPastLogs({
          fromBlock: block.number,
          toBlock: block.number,
          topics: [
            "0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822",
          ],
        });
      } catch (e) {
        console.log({
          message: "can't retrieve logs",
          error: JSON.stringify(e),
        });
        throw e;
      }

      const records = swaps.map((swap) => {
        let result;
        try {
          result = web3Client.eth.abi.decodeLog(inputs, swap.data, [
            swap.topics[1],
            swap.topics[2],
          ]);
        } catch (e) {
          console.log({
            message: "Error in abi decoding",
            error: JSON.stringify(e),
          });
          return;
        }

        const data = {
          address: swap.address,
          sender: result.sender,
          receiver: result.to,
          base_in: result.amount0In,
          quote_in: result.amount1In,
          base_out: result.amount0Out,
          quote_out: result.amount1Out,
          block_number: swap.blockNumber,
          transaction_hash: swap.transactionHash,
          log_index: swap.logIndex,
          block_timestamp: new Date(block.timestamp * 1000).toISOString(),
        };

        return {
          Data: Buffer.from(JSON.stringify(data)),
          PartitionKey: `LOGS-${new Date().getTime()}`,
        };
      });

      // @ts-ignore
      const mappedLogs = records.filter((el) => el);

      if (mappedLogs.length > 1) {
        let i, j, logBatch;
        for (i = 0, j = mappedLogs.length; i < j; i += 25) {
          logBatch = mappedLogs.slice(i, i + 25);
          client.putRecords(
            {
              Records: logBatch,
              StreamName: process.env.STREAM_NAME,
            },
            (err, data) => {
              if (err) {
                console.error({
                  message: "Error Streaming Swaps Logs to kinesis",
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
        message: `Swaps Enqueued to kinesis for block`,
        status: "success",
        blockChain: process.env.CHAIN_ID,
        object: "logs",
        readable_date: new Date(block.timestamp * 1000).toISOString(),
        timestamp: block.timestamp * 1000,
        number: block.number,
      });
    }
  } catch (error) {
    console.error({
      message: "Error occured while streaming Swaps Logs into kinesis",
      error: JSON.stringify(error),
      blockChain: process.env.CHAIN_ID,
      object: "logs",
    });
    throw error;
  }

  return {
    body: JSON.stringify({
      message: `Executed Lambda Successfully, Streamed the Swaps Logs into kinesis`,
    }),
    statusCode: 200,
  };
};
