const { newWeb3 } = require("/opt/nodejs/web3-utils");
const { snakeCaseKeys } = require("/opt/nodejs/helpers");
const AWS = require("aws-sdk");

const web3 = newWeb3(process.env.FULL_NODE);

exports.handler = async (event, context) => {
  const client = new AWS.Kinesis({ region: process.env.AWS_REGION });

  try {
    console.log({ message: "Retrieving records from the SQS Queue" });
    console.log({ message: "Records", data: JSON.stringify(event.Records) });
    const records = event.Records.map((record) => {
      const payload = Buffer.from(record.kinesis.data, "base64").toString(
        "ascii"
      );
      return JSON.parse(payload);
    });

    for (const record of records) {
      const keys = record.dynamodb.Keys;
      const number = keys?.block_number.N;
      console.log({ message: "request block" });
      const block = await web3.getBigGasBlockWithTransactions(number, false);

      const mappedBlock = snakeCaseKeys({
        ...block,
        transaction_count: block.transactions.length,
        timestamp: new Date(parseInt(block.timestamp) * 1000),
      });

      console.log({ message: "mapped block", data: mappedBlock });

      const params = {
        Data: Buffer.from(JSON.stringify(mappedBlock)),
        PartitionKey: `BLOCKS-${new Date().getTime()}`,
        StreamName: process.env.STREAM_NAME || "",
      };

      client.putRecord(params, (err, data) => {
        if (err) {
          console.log({
            message: "Error streaming blocks to kinesis",
            error: JSON.stringify(err),
            blockChain: process.env.CHAIN_ID,
            object: "blocks",
          });
          throw err;
        } else {
          console.log({
            status: "success",
            blockChain: process.env.CHAIN_ID,
            object: "blocks",
          });
        }
      });
    }
  } catch (error) {
    console.error({
      message: "Error occured while streaming blocks data into kinesis: ",
      error: JSON.stringify(error),
      blockChain: process.env.CHAIN_ID,
      object: "blocks",
    });
    throw error;
  }

  return {
    body: JSON.stringify({
      message: `Executed Lambda Successfully, Streamed the blocks into kinesis`,
    }),
    statusCode: 200,
  };
};
