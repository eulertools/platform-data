import { categories, subcategories } from '../abi';
import { web3Client } from '../web3Clients';
import { fillFunctions } from './fillFunctions';
import supportInterface from "./supportInterface";

const INIT_FUNCTION = '8063';

const scan = async (contract:string) => {

    const address:any = { address: contract};

    let byteCode = await web3Client.eth.getCode(contract);

    const reMethod = new RegExp(`${INIT_FUNCTION}[0-9a-fA-F]{8}`, 'g');

    byteCode = byteCode.replace('0x','');

    const matches = byteCode.matchAll(reMethod);

    const methods = new Set();

    for(const match of matches) methods.add(
      match[0].replace(INIT_FUNCTION,'0x')
    );

    const methodsEnriched = await fillFunctions([...methods]);
  
    if(byteCode !== '') {

      const category:any[] = [];
      const subcategory:any[] = [];

      const startByteCode = byteCode.substring(0,10);

      byteCode = byteCode.substring(byteCode.indexOf(startByteCode) + startByteCode.length);

      const nextMask = byteCode.indexOf(startByteCode);

      if(nextMask > 0) byteCode = byteCode.substring(0, nextMask)

      categories.forEach((element:any) => {

        if(supportInterface(byteCode, element)) {

          category.push(element.kind);

          const elements:any = subcategories[element.kind];

          if(elements) {
            elements.forEach((subelement:any) => {
              if(supportInterface(byteCode, subelement)) {
                subcategory.push(subelement.kind);
              }
            });
          }
        }
        
      });
      address.category = category;
      address.subcategory = subcategory;
      address.abi = [...methodsEnriched];
      address.byte_code = byteCode;
      
    } else {
  
      address.category = ['address'];
    }

    return address;
}
export default scan;

