const { newWeb3 } = require("/opt/nodejs/web3-utils");
const { snakeCaseKeys } = require("/opt/nodejs/helpers");
const AWS = require("aws-sdk");

const web3Client = newWeb3(process.env.FULL_NODE);

exports.handler = async (event, context) => {
    const client = new AWS.Kinesis({region: process.env.AWS_REGION});

    try {
        const records = event.Records.map((record) => {
            const payload = Buffer.from(record.kinesis.data, "base64").toString(
                "ascii"
            );
            return JSON.parse(payload);
        });

        for (const record of records) {
            const keys = record.dynamodb.Keys;
            const number = keys?.block_number.N;
            console.log({message: "request block"});
            const block = await web3Client.getBigGasBlockWithTransactions(number, false);

            console.log({message: "request logs"});
            const logs = await web3Client.eth.getPastLogs({
                fromBlock: number,
                toBlock: number,
            });

            console.log({message: "logs", data: logs.length});

            const mappedLogs = logs.map((log, index) => {
                return {
                    Data: Buffer.from(
                        JSON.stringify(
                          snakeCaseKeys({
                                ...log,
                                address: log.address.toLowerCase(),
                                topic0: log.topics[0],
                                topic1: log.topics[1],
                                topic2: log.topics[2],
                                topic3: log.topics[3],
                                topic4: log.topics[4],
                                topic5: log.topics[5],
                                block_timestamp: new Date(block.timestamp * 1000).toISOString(),
                            })
                        )
                    ),
                    PartitionKey: `LOGS-${new Date().getTime()}`,
                };
            });

            console.log(mappedLogs.length);

            let i, j, logBatch;
            for (i = 0, j = mappedLogs.length; i < j; i += 25) {
                logBatch = mappedLogs.slice(i, i + 25);

                client.putRecords(
                    {Records: logBatch, StreamName: process.env.STREAM_NAME || ""},
                    (err, data) => {
                        if (err) {
                            console.log({
                                message: "Error streaming logs to kinesis",
                                error: JSON.stringify(err),
                                blockChain: process.env.CHAIN_ID,
                                object: "logs",
                            });
                            throw err;
                        } else {
                            console.log({
                                status: "success",
                                blockChain: process.env.CHAIN_ID,
                                object: "logs",
                            });
                        }
                    }
                );
            }
        }
    } catch (error) {
        console.error({
            message: "Error occured while streaming logs data into kinesis: ",
            error: JSON.stringify(error),
            blockChain: process.env.CHAIN_ID,
            object: "logs",
        });
        throw error;
    }

    return {
        body: JSON.stringify({
            message: `Executed Lambda Successfully, Streamed the logs into kinesis`,
        }),
        statusCode: 200,
    };
};
