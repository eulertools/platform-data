const { QldbDriver, RetryConfig } = require("amazon-qldb-driver-nodejs");
const { Agent } = require("https");

require("dotenv").config();

const ledgerName = process.env.LEDGER_NAME;

const driver = () => {
  const maxConcurrentTransactions = 10;
  const agentForQldb = new Agent({
    keepAlive: true,
    maxSockets: maxConcurrentTransactions,
  });
  const serviceConfigurationOptions = {
    region: process.env.AWS_REGION,
    httpOptions: {
      agent: agentForQldb,
    },
  };
  const retryLimit = 4;
  // Use driver's default backoff function for this example (no second parameter provided to RetryConfig)
  const retryConfig = new RetryConfig(retryLimit);
  return new QldbDriver(
    ledgerName,
    serviceConfigurationOptions,
    maxConcurrentTransactions,
    retryConfig
  );
};

module.exports = { driver };
