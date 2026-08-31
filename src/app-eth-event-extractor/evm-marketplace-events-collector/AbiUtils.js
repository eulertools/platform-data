const Web3 = require("web3");
const ABI_TOPICS = require("./abi/marketplace");

class AbiUtils {
  constructor() {
    this.events = new Map();

    this.getEvents(ABI_TOPICS, new Web3()).forEach((event) => {
      this.events.set(event.signature, event.inputs);
    });
  }

  decode(web3, log) {
    let result;

    const [topic0, ...topicParams] = log.topics;

    const method = this.events.get(topic0);

    if (method) {
      try {
        const params = method.filter((element) => element.indexed).length;

        result = web3.eth.abi.decodeLog(
          this.events.get(topic0),
          log.data,
          topicParams.slice(0, params)
        );
      } catch (e) {
        console.log("WARN", e.message);
      }
    }

    return result;
  }

  getEvents(abi, web3) {
    const events = abi.filter(
      (e) => e.type === "event" && e.anonymous === false
    );

    events.forEach((event) => {
      const signature = web3.eth.abi.encodeEventSignature(event);

      event.signature = signature;
    });

    return events;
  }

  getMethodFromAbi(abi, name, type) {
    const method = abi.find(
      (element) => element.name === name && element.type === type
    );

    return method ? method.inputs : [];
  }
}

const abiUtils = new AbiUtils();

export default abiUtils;
