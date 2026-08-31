exports.handler = async (event, context, callback) => {
  const output = event.records.map((record) => {
    console.log(record.recordId);
    const payload = JSON.parse(Buffer.from(record.data, "base64").toString());
    return {
      recordId: record.recordId,
      result: "Ok",
      data: Buffer.from(JSON.stringify(payload)).toString("base64"),
    };
  });
  console.log(`Processing completed.  Successful records ${output.length}.`);
  callback(null, { records: output });
};
