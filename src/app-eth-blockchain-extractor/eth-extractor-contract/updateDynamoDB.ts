
import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";

const ddbClient = new DynamoDB({});

const marshallOptions = {
  convertEmptyValues: true,
  removeUndefinedValues: true,
  convertClassInstanceToMap: true,
};

export const updateDynamoDB = async (table: any, key: any, value: any) => {

  let updateExpression = "SET ";
  const expressionAttributeNames:any = {}
  const expressionAttributeValues:any = {}

  const valueMarshal = marshall(value, marshallOptions);

  const keys = Object.keys(key);

  Object.keys(value).forEach((entry: any) => {
    if (!keys.includes(entry)) {
      updateExpression = `${updateExpression} #${entry} = :${entry}, `;
      expressionAttributeNames[`#${entry}`] = entry;
      expressionAttributeValues[`:${entry}`] = valueMarshal[entry];
    }
  })

  updateExpression = updateExpression.substring(0, updateExpression.lastIndexOf(','));

  const params = {
    TableName: table,
    Key: marshall(key),
    UpdateExpression: updateExpression,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues
  };

  await ddbClient.updateItem(params);
}
