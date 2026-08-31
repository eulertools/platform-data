const AWS = require("aws-sdk");

const ddbClient = new AWS.DynamoDB.DocumentClient();

const chuck = 5;

export const fillFunctions = async (methods:any[]) => {

  let methodsEnriched:any[] = []
  
  for (let i = 0, j = methods.length; i < j; i += chuck) {

    const methodsChunk = methods.slice(i, i + chuck);

    methodsEnriched = methodsEnriched.concat(await Promise.all(methodsChunk.map(async (signature:any) => {

      const method:any = { signature };

      method.type = 'function';

      const search = {
        TableName: process.env.DATABASE_NAME!,
        KeyConditionExpression: 'signature = :signature',
        ExpressionAttributeValues: { ":signature": signature }
      };
      
      const { Items } = await ddbClient.query(search).promise();
      
      if(Items && Items.length > 0) {
        method.name = Items[0].function_name;
        method.inputs = Items[0].inputs;
        if(Items[0].outputs) method.outputs = Items[0].outputs;
        if(Items[0].verified) method.verified = Items[0].verified;
        if(Items[0].stateMutability) method.stateMutability = Items[0].stateMutability;
      }

      return method;

    })));
  }

  return methodsEnriched;
}
