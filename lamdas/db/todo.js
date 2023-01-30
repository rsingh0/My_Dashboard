const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const client = new DynamoDBClient({
  region: "us-east-1",
  // To fix DynamoDB timeouts as API-Gateway returns timeout in 29 secs
  // https://seed.run/blog/how-to-fix-dynamodb-timeouts-in-serverless-application.html
  httpOptions: {
    timeout: 5000,
  },
  maxRetries: 3, // by default 10 times
});

module.exports = client;
