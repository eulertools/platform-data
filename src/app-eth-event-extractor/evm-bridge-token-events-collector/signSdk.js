const sign = async (web3, privateKey, hash) => {
  let signature = await web3.eth.accounts.sign(hash, privateKey);

  return {
    value: hash,
    signature: signature.signature,
    v: signature.v,
    r: signature.r,
    s: signature.s,
  };
};

module.exports = { sign };
