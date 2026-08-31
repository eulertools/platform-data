const Web3 = require("web3");

const web3 = new Web3(
  "https://bsc-dataseed.binance.org/"
);

const getBlockData = (num) => {
  const block = web3.eth.getBlock(num);
  return block.then((res) => res);
};

const getBlockNumber = (num) => {
  return getBlockData(num).then((res) => res);
};

const getBlockLogsData = async (num) => {
  const number = await getBlockNumber(num).then((res) => res);
  const logs = await web3.eth.getPastLogs({
    fromBlock: number,
    toBlock: number,
  });

  return logs;
};

const getBlocksTransactionData = async (startBlockNumber, endBlockNumber) => {
  let transactions = [];

  for (let i = startBlockNumber; i <= endBlockNumber; i++) {
    let block = await getBlockData(i);

    if (block != null) {
      if (block.transactions != null && block.transactions.length != 0) {
        transactions = transactions.concat(block.transactions);
      }
    }
  }

  return transactions;
};

const getBlocksByRange = async (startBlockNumber, endBlockNumber) => {
  let blocks = [];
  for (let i = startBlockNumber; i <= endBlockNumber; i++) {
    let block = await getBlockData(i);

    if (block != null) {
      blocks = blocks.concat(block);
    }
  }

  return blocks;
};

exports.handler = async (event) => {
  const blocks = await getBlocksByRange(20000000, 20000100);

  console.log("blocks: ", blocks);

  const transactions = await getBlocksTransactionData(20000000, 20000100);

  const logs = await getBlockLogsData();

  console.log(transactions.length + " transactions found");
  console.log(transactions);
  return { blocks, transactions, logs };
};
