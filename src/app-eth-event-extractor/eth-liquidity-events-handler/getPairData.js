const { DynamoDBClient, GetItemCommand } = require("@aws-sdk/client-dynamodb");
const { unmarshall } = require("@aws-sdk/util-dynamodb");
const { web3Client } = require("./web3Clients");

const getPairData = async (pairAddress) => {
  const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION });
  const address = web3Client.utils.toChecksumAddress(pairAddress);

  const command = new GetItemCommand({
    TableName: process.env.CATALOG_DDB_TABLE, //TABLE_NAME
    Key: {
      identifier: { S: `${process.env.CHAIN_ID}~contract~${address}` },
      kind: { S: "contract" },
    },
    ProjectionExpression:
      "identifier,kind,base_token_address,quote_token_address,base_token_symbol,quote_token_symbol,quote_token_decimals,base_token_decimals,factory_address,address,volumes",
  });

  let ddbItem;

  try {
    ddbItem = await ddbClient.send(command);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    if (ddbItem.Item) {
      return unmarshall(ddbItem.Item);
    } else {
      console.log({ message: "Pair Data not found", address });
      return null;
    }
  } catch (e) {
    console.log({ message: e, address });
    return null;
  }
};

module.exports = { getPairData };
