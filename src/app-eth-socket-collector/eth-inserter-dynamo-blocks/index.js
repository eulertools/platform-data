const { DynamoDB } = require("aws-sdk");

const ddbClient = new DynamoDB({});

exports.handler = async (event, context) => {
  try {
    console.log({ message: "Retrieving records from the SQS Queue" });
    for (const record of event.Records) {
      const { block_timestamp, block_number } = JSON.parse(record.body);

      const params = {
        TableName: process.env.DDB_TABLE,
        Item: {
          block_number: { N: block_number.toString() },
          block_timestamp: { N: block_timestamp.toString() },
        },
        ConditionExpression: "attribute_not_exists(block_number)",
      };

      ddbClient.putItem(params, function (err, data) {
        if (err) {
          console.log({
            message: "Error occured while inserting records",
            error: JSON.stringify(err),
          });
        } else {
          console.log({
            status: "success",
            block_number,
            block_timestamp,
            blockChain: process.env.CHAIN_ID,
            object: "blocks",
          });
        }
      });
    }
  } catch (error) {
    console.error({
      message: "Error occured while inserting blocks record into dynamodb: ",
      error: JSON.stringify(error),
      blockChain: process.env.CHAIN_ID,
      object: "blocks",
    });
    throw error;
  }
};
