const BRIDGE_EVENT = require("./abi/BRIDGE_EVENT");
const { sign } = require("./signSdk");
const QLDB = require("./qldb");

const Web3 = require("web3");

exports.handler = async (event, context) => {
  const contract = process.env.CONTRACT_ADDRESS
    ? process.env.CONTRACT_ADDRESS
    : undefined;
  const topicsSearch = process.env.TOPICS
    ? JSON.parse(process.env.TOPICS)
    : undefined;
  const privateKey = process.env.PRIVATE_KEY;

  const web3 = new Web3(process.env.FULL_NODE);

  let driver;

  try {
    console.log({ message: "Retrieving records from the SQS Queue" });

    driver = QLDB.driver();

    for (const record of event.Records) {
      console.log("pre record", JSON.stringify(record));
      const message = JSON.parse(record.body);
      console.log("parsed message", message);
      const block = JSON.parse(message.Message);
      console.log("parsed params", block, contract, topicsSearch);

      let events;

      try {
        const params = {
          fromBlock: block.number,
          toBlock: block.number,
        };

        if (contract) params.address = [contract];
        if (topicsSearch) params.topics = topicsSearch;

        events = await web3.eth.getPastLogs(params);
      } catch (e) {
        console.log({
          message: "can't retrieve logs",
          error: JSON.stringify(e),
        });
        throw e;
      }

      if (events) {
        events = await Promise.all(
          events.map(async (log) => {
            const [, ...topics] = log.topics;

            const decodeLog = web3.eth.abi.decodeLog(
              BRIDGE_EVENT.inputs,
              log.data,
              topics
            );

            const ticket = {
              chain_id_destination: decodeLog.chainIdDestination,
              chain_id_origin: decodeLog.chainIdOrigin,
              transaction_origin: log.transactionHash,
              log_index_origin: log.logIndex,
              token_origin: log.address.toLowerCase(),
              token_destination: decodeLog.tokenDestination.toLowerCase(),
              block_origin: block.number,
              block_timestamp: block.timestamp,
              readable_block_timestamp: new Date(
                block.timestamp * 1000
              ).toISOString(),
              amount: decodeLog.amount,
              account: decodeLog.account.toLowerCase(),
            };

            const hash = web3.utils.sha3(
              web3.utils.encodePacked(
                { value: "0x19", type: "bytes1" },
                { value: "0x0", type: "bytes1" },
                { value: ticket.chain_id_origin, type: "uint256" },
                { value: ticket.transaction_origin, type: "bytes32" },
                { value: ticket.log_index_origin, type: "uint256" },
                { value: ticket.chain_id_destination, type: "uint256" },
                { value: ticket.token_origin, type: "address" },
                { value: ticket.token_destination, type: "address" },
                { value: ticket.amount, type: "uint256" },
                { value: ticket.account, type: "address" }
              )
            );

            const signature = await sign(web3, privateKey, hash);

            return { ticket, hash, signature };
          })
        );

        for (const event of events) {
          const value = {
            ticket_id: `${event.ticket.chain_id_origin}~${event.ticket.transaction_origin}~${event.ticket.log_index_origin}`,
            ...event.ticket,
            signature: event.signature,
          };

          await driver.executeLambda(async (txn) => {
            await txn.execute(`INSERT INTO bridge ?`, value);
          });

          console.log(`Insert register with id ${value.ticket_id}`);
        }
      }
    }
  } catch (error) {
    console.error({
      message: "Error occured while streaming Bridge Token Logs into kinesis",
      error: error,
      blockChain: process.env.CHAIN_ID,
      object: "logs",
    });
    throw error;
  } finally {
    if (driver) driver.close();
  }

  return {
    body: JSON.stringify({
      message: `Executed Lambda Successfully, Streamed the Marketplace Logs into kinesis`,
    }),
    statusCode: 200,
  };
};
