import { Context, SQSEvent } from 'aws-lambda';
import { updateDynamoDB } from './updateDynamoDB';
const { newWeb3 } = require("/opt/nodejs/web3-utils");

import scan from './contract/kindContract';

const reservedKeyword:string[] = [];

const web3 = new newWeb3(process.env.FULL_NODE);

export async function handler(event: SQSEvent, context: Context):Promise<any> {

  for (const record of event.Records) {

    console.log("pre record", JSON.stringify(record));
    const message = JSON.parse(record.body);
    console.log("parsed message", message);
    const request = JSON.parse(message.Message);
    console.log("parsed request", request);

    const result:any = await scan(request.address.toLowerCase());

    let kind = 'contract';

    if(result.category.includes('erc20')) kind = 'token';
    else if(result.category.includes('erc720')) kind = 'nft';
    else if(result.category.includes('address')) kind = 'address';

    const contract:any = {
      identifier: `${process.env.CHAIN_ID}~${kind}~${result.address}`,
      kind,
      ...result
    }
    
    const methodsVerified = result.abi.filter(
      (method:any) => method.verified === 'Verified' &&
        method.stateMutability === 'view' &&
        method.inputs.length === 0 &&
        method.outputs.length > 0);

    console.log(methodsVerified);

    await Promise.all(methodsVerified.map(async (method:any) => {
      const name = reservedKeyword.includes(method.name) ? `contract_${method.name}` : method.name;
      contract[name] = await web3.ext.readContract(request.address, method);
      if(method.outputs[0].type === 'address') contract[name] = contract[name].toLowerCase();
    }))

    console.log(contract);
    
    await updateDynamoDB('catalog', { identifier: contract.identifier, kind }, contract);

    console.log(`Load data of ${contract.identifier}`);
  }

  return {
    body: JSON.stringify({
      message: `Executed Lambda Successfully`,
    }),
    statusCode: 200,
  };
}
