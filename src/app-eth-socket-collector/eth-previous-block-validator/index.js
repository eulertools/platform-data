const { DynamoDB, SQS } = require("aws-sdk");

const ddbClient = new DynamoDB({});

const arr = [0, 1, 2, 3, 4];

const sqs = new SQS();

const blockChecker = async (number, timestamp) => {
  return new Promise((resolve, reject) => {
    const params = {
      TableName: process.env.DDB_TABLE,
      Key: {
        block_number: { N: number },
        block_timestamp: { N: timestamp },
      },
    };

    ddbClient.getItem(params, function (err, data) {
      if (err) {
        console.log({
          message: "Block does not exists in dynamodb, reinserting it",
        });
        const params = {
          DelaySeconds: 0,
          MessageBody: JSON.stringify({
            block_number: number.toString(),
            block_timestamp: timestamp.toString(),
          }),
          QueueUrl: process.env.BLOCK_QUEUE_URL,
        };

        sqs.sendMessage(params, function (err, data) {
          if (err) {
            console.log({ message: "Error", err: JSON.stringify(err) });
            reject();
          } else {
            console.log({ message: "Block is enqueued", blockNumber: number });
            resolve();
          }
        });
      } else {
        console.log({
          message: "Block is present in dynamodb",
          data: JSON.stringify(data),
        });
        resolve();
      }
    });
  });
};

exports.handler = async (event, context) => {
  if (!event.Records) {
    console.log({ message: "No records to process. Exiting" });
    return;
  }

  console.log({ message: "Retrieving records from the kinesis stream" });
  const records = event.Records.map((record) => {
    const payload = Buffer.from(record.kinesis.data, "base64").toString(
      "ascii"
    );
    return JSON.parse(payload);
  });

  for (const record of records) {
    try {
      const keys = record.dynamodb.Keys;

      console.log({
        message: "Record to be validating in dynamodb: ",
        record: JSON.stringify(keys),
      });

      const number = keys?.block_number.N;
      const timestamp = keys?.block_timestamp.N;

      arr.forEach(async (i) => {
        const num = number - i;
        const timeStamp = timestamp + i;
        await blockChecker(num, timeStamp);
      });
    } catch (err) {
      console.log(err);
    }
  }
};
