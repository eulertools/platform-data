const TOKEN_INFO_JSON = require("./abi/tokenInfo");

class TokenSDK {
  ETH_ADDRESS = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
  NO_TOKEN_ADDRESS = "0x0000000000000000000000000000000000000000";
  TOKEN_ETH = {
    name: "BNB",
    symbol: "BNB",
    decimals: 18,
    address: this.ETH_ADDRESS,
  };
  NO_TOKEN = {
    name: "",
    symbol: "",
    decimals: 0,
    address: "",
  };

  constructor(web3, contractAddress) {
    this.web3 = web3;
    this.contractAddress = contractAddress;
  }

  getInstance = async () => {
    if (!this.instance) {
      const json = TOKEN_INFO_JSON;
      this.instance = new this.web3.eth.Contract(json, this.contractAddress);
    }

    return this.instance;
  };

  infoWithAmount = async (address, amountWei) => {
    let token = this.NO_TOKEN;
    let amount = 0;

    if (
      address &&
      address !== this.ETH_ADDRESS &&
      address !== this.NO_TOKEN_ADDRESS
    ) {
      token = await this.info(address);

      amount = amountWei;

      if (token.decimals > 0) {
        amount = amountWei / 10 ** token.decimals;
      }
    } else if (address === this.ETH_ADDRESS) {
      token = this.TOKEN_ETH;
      amount = amountWei / 10 ** 18;
    }

    return { token, amount };
  };

  info = async (address) => {
    address = address.toLowerCase();
    const instance = await this.getInstance();
    const token = await instance.methods.generalInfo(address).call();
    const { name, symbol, decimals } = token;
    return { name, address, symbol, decimals };
  };
}

export default TokenSDK;
