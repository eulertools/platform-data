const AWS = require("aws-sdk");
const Web3 = require("web3");

const web3Client = new Web3(process.env.FULL_NODE);

const inputs = [
  {
    indexed: true,
    internalType: "address",
    name: "from",
    type: "address",
  },
  {
    indexed: true,
    internalType: "address",
    name: "to",
    type: "address",
  },
  {
    indexed: false,
    internalType: "uint256",
    name: "value",
    type: "uint256",
  },
];

exports.handler = async (event, context) => {
  const client = new AWS.Kinesis({ region: process.env.AWS_REGION });

  try {
    console.log("Retrieving records from the SQS Queue");
    for (const record of event.Records) {
      const message = JSON.parse(record.body);
      const block = JSON.parse(message.Message);

      let logs;
      try {
        logs = await web3Client.eth.getPastLogs({
          fromBlock: block.number,
          toBlock: block.number,
          topics: [
            "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
          ],
        });
      } catch (e) {
        console.log({
          message: "can't retrieve logs",
          error: JSON.stringify(e),
        });
        throw e;
      }

      const records = logs.map((transfer) => {
        let result;
        let value, to, from;

        if (transfer.data === "0x") return; // Transfer NFT

        try {
          result = web3Client.eth.abi.decodeLog(inputs, transfer.data, [
            transfer.topics[1],
            transfer.topics[2],
          ]);
          value = parseInt(result.value, 10);
          to = result.to;
          from = result.from;
        } catch (e) {
          console.log({
            message: "Error in abi decoding",
            error: JSON.stringify(e),
            log: transfer,
          });
          return;
        }

        const data = {
          token_address: transfer.address,
          from_address: from,
          to_address: to,
          value,
          transaction_hash: transfer.transactionHash,
          transaction_index: transfer.transactionIndex,
          log_index: transfer.logIndex,
          block_timestamp: new Date(block.timestamp * 1000).toISOString(),
          block_number: block.number,
          block_hash: transfer.blockHash,
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
                console.log({
                  message: "Error Streaming Token Transfer Logs to kinesis",
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
        message: `Token Transfers Enqueued to kinesis for block`,
        status: "success",
        blockChain: process.env.CHAIN_ID,
        object: "tokenTransfers",
        readable_date: new Date(block.timestamp * 1000).toISOString(),
        timestamp: block.timestamp * 1000,
        number: block.number,
      });
    }
  } catch (error) {
    console.error({
      message: "Error occured while streaming Token Transfer Logs into kinesis",
      error: JSON.stringify(error),
      blockChain: process.env.CHAIN_ID,
      object: "logs",
    });
    throw error;
  }

  return {
    body: JSON.stringify({
      message: `Executed Lambda Successfully, Streamed the Token Transfer Logs into kinesis`,
    }),
    statusCode: 200,
  };
};
