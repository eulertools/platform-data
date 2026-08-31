const { getAddress } = require("./getAddress");
const { web3Client } = require("./web3Clients");

const ABI = [
  {
    indexed: true,
    internalType: "address",
    name: "token0",
    type: "address",
  },
  {
    indexed: true,
    internalType: "address",
    name: "token1",
    type: "address",
  },
  {
    indexed: false,
    internalType: "address",
    name: "pair",
    type: "address",
  },
  {
    indexed: false,
    internalType: "uint256",
    name: "",
    type: "uint256",
  },
];

const pairCreatedMapper = (receipt) => {
  try {
    let address = "";
    try {
      const result = web3Client.eth.abi.decodeLog(ABI, receipt.data, [
        receipt.topics[1],
        receipt.topics[2],
      ]);
      address = result.pair;
    } catch (e) {
      console.log("error in abi decoder", e, receipt);
    }

    return {
      token0: getAddress(receipt.topics[1]),
      token1: getAddress(receipt.topics[2]),
      address: address,
    };
  } catch (e) {
    console.log("Failed mapper", {
      hash: receipt.transaction_hash,
      log_index: receipt.log_index,
      error: e,
    });
    throw e;
  }
};

module.exports = { pairCreatedMapper };
