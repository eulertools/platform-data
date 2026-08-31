const Web3 = require("web3");

class MarketplaceSDK {
  constructor(provider, ETH) {
    this.web3 = new Web3(provider);

    this.provider = provider;

    this.ETH = ETH;
  }

  getInstance = async (contractAddress, json) =>
    new this.web3.eth.Contract(json, contractAddress);

  info = async (instance, kind, saleId) => {
    const response = await instance.methods.info(kind, saleId).call();

    return {
      saleId: saleId.toString(),
      kind: kind.toString(),
      amountBase: response.amountBase,
      amountQuote: response.amountQuote,
      openingTime: response.openingTime,
      closingTime: response.closingTime,
      tokenBaseId: response.tokenBaseId,
      tokenQuoteId: response.tokenQuoteId,
      tokenBase: response.tokenBase,
      tokenQuote: response.tokenQuote,
      seller: response.seller,
      numberPackages: response.numberPackages,
      lockoutPeriod: response.lockoutPeriod,
      amountPending: response.amountPending,
    };
  };

  infoPackage = async (instance, kind, saleId, account, numberPackage) => {
    const [lockedUntil, amount, claimed] = await instance.methods
      .infoPackage(kind, saleId, account, numberPackage)
      .call();

    return {
      lockedUntil,
      amount,
      claimed,
    };
  };
}

export default MarketplaceSDK;
