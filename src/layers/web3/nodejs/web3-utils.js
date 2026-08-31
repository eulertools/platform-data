const Web3 = require("web3");
const {bigGasLimitTransactionFormatter, bigGasBlockFormatter} = require("./bigGas");

const readContract = async (web3, address, abi, methodName, ...args) => {
    const methods = abi.filter((method) => method.name === methodName);
    const contract = new web3.eth.Contract(methods, address);
    return contract.methods[methods[0].name](...args).call();
}

const writeContract = async (web3, address, abi, methodName, parameterCall, ...args) => {
    const methods = abi.filter((method) => method.name === methodName);
    const contract = new web3.eth.Contract(methods, address);
    return contract.methods[methods[0].name](...args).send(parameterCall);
}

const newWeb3 = (provider) => {

    const web3 = new Web3(provider);

    web3.ext = {
        currentAccount: async () => (await web3.eth.getAccounts())[0],
        writeContract: async (address, abi, methodName, parameterCall, ...args) =>
            writeContract(web3, address, abi, methodName, parameterCall, ...args),
        readContract: async (address, abi, methodName, ...args) =>
            readContract(web3, address, abi, methodName, ...args),

        balanceOf: async (account) =>
            web3.utils.fromWei(await web3.eth.getBalance(account)),
        transfer: async (to, amount) => {

            const from = await provider.currentAccount();

            return web3.eth.sendTransaction({from, to, value: amount})
        }
    }

    web3.extend({
        methods: [
            {
                name: 'getBigGasLimitTransaction',
                call: 'eth_getTransactionByHash',
                params: 1,
                inputFormatter: [null],
                outputFormatter: bigGasLimitTransactionFormatter,
            },
            {
                name: 'getBigGasBlockWithTransactions',
                call: 'eth_getBlockByNumber',
                params: 2,
                inputFormatter: [web3.utils.numberToHex, null],
                outputFormatter: bigGasBlockFormatter,
            },
        ],
    });

    return web3;
}

exports.newWeb3 = newWeb3;
exports.Web3 = Web3;
exports.NetworkProvider = require('@truffle/hdwallet-provider');
