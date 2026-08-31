const { newWeb3 } = require("/opt/nodejs/web3-utils");
const { _, snakeCaseKeys } = require("/opt/nodejs/helpers");
const AWS = require("aws-sdk");

const web3Client = newWeb3(process.env.FULL_NODE);

exports.handler = async (event, context) => {
  const client = new AWS.Kinesis({ region: process.env.AWS_REGION });

  try {
    const records = event.Records.map((record) => {
      const payload = Buffer.from(record.kinesis.data, "base64").toString(
        "ascii"
      );
      return JSON.parse(payload);
    });

    for (const record of records) {
      const keys = record.dynamodb.Keys;
      const number = keys?.block_number.N;
      console.log({ message: "request block", number });

      const block = await web3Client.getBigGasBlockWithTransactions(number, true);

      const mappedTransactions = block.transactions.map((transaction) => {
        const mappedTransaction = snakeCaseKeys({
          ...transaction,
          block_timestamp: new Date(block.timestamp * 1000).toISOString(),
        });

        console.log(mappedTransaction)

        return {
          Data: Buffer.from(JSON.stringify(mappedTransaction)),
          PartitionKey: `TRANSACTIONS-${new Date().getTime()}`,
        };
      });

      let i, j, logBatch;
      for (i = 0, j = mappedTransactions.length; i < j; i += 5) {
        logBatch = mappedTransactions.slice(i, i + 5);

        client.putRecords(
          { Records: logBatch, StreamName: process.env.STREAM_NAME || "" },
          (err, data) => {
            if (err) {
              console.log({
                message: "Error streaming the transactions data to kinesis",
                error: JSON.stringify(err),
                blockChain: process.env.CHAIN_ID,
                object: "transactions",
              });
              throw err;
            } else {
              console.log({
                status: "success",
                blockChain: process.env.CHAIN_ID,
                object: "transactions",
              });
            }
          }
        );
      }
    }
  } catch (error) {
    console.error({
      message: "Error occured while streaming transactions data into kinesis: ",
      error: JSON.stringify(error),
      blockChain: process.env.CHAIN_ID,
      object: "transactions",
    });
    throw error;
  }

  return {
    body: JSON.stringify({
      message: `Executed Lambda Successfully, Streamed the transactions into kinesis`,
    }),
    statusCode: 200,
  };
};
