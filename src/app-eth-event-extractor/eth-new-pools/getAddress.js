const web3Utils = require("web3-utils");

const getAddress = (address) => {
  let i = -1;
  let exit = false;
  let result = address;
  while (!exit && i < address.length) {
    i++;
    result = "0x" + address.substring(i);
    exit = web3Utils.isAddress(result);
  }

  return web3Utils.toChecksumAddress(result);
};

const toObject = (obj) => {
  return JSON.parse(
    JSON.stringify(
      obj,
      (key, value) => (typeof value === "bigint" ? value.toString() : value) // return everything else unchanged
    )
  );
};

module.exports = { getAddress, toObject };
