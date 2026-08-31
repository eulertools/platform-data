const INIT_FUNCTION = '8063';

const supportInterface = (byteCode:any, cateogory:any) => {

    let support = true;

    cateogory.signatures.forEach((signature:any) => {

        support = support && byteCode.includes(signature.replace('0x', INIT_FUNCTION));
    });

    return support;
}

export default supportInterface;
