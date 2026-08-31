const { SNS } = require("aws-sdk");

exports.handler = async (event) => {
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

  const snsClient = new SNS({});

  for (const record of records) {
    try {
      let result;

      const keys = record.dynamodb.Keys;

      console.log({
        message: "Record to be inserted: ",
        record: JSON.stringify(record),
      });

      const number = keys?.block_number.N;
      const timestamp = keys?.block_timestamp.N;

      if (!record.dynamodb.NewImage) {
        console.log({
          message:
            "Trying to index new document but the DynamoDB stream event did not provide the NewImage. Skipping...",
        });
        // eslint-disable-next-line no-continue
        continue;
      }

      const command = {
        Message: JSON.stringify({
          number: number.toString(),
          timestamp: timestamp.toString(),
        }),
        TopicArn: process.env.TOPIC_ARN,
      };

      result = command;
      result = await snsClient
        .publish(command)
        .promise()
        .then((data) => {
          console.log({
            status: `success`,
            readable_date: new Date(timestamp * 1000).toISOString(),
            timestamp,
            number,
            object: "blocks",
          });
        })
        .catch((err) => {
          console.error({
            status: "error",
            error: JSON.stringify(err),
            readable_date: new Date(timestamp * 1000).toISOString(),
            timestamp,
            number,
            object: "blocks",
          });
        });
    } catch (err) {
      console.log({
        status: "error",
        error: JSON.stringify(err),
        object: "blocks",
      });
    }
  }
};
