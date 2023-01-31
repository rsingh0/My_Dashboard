const EventBridge = require("aws-sdk/clients/eventbridge");
const EVENT_BUS_NAME = process.env.EventBusName;

const eventBridge = new EventBridge();

module.exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  const body = JSON.parse(event.body);
  console.log("Main Event Bridge Body", JSON.stringify(body));

  // Put Events in Event Bridge
  const param = {
    Entries: [
      {
        EventBusName: EVENT_BUS_NAME,
        Detail: JSON.stringify({
          city: body.city ? body.city.toLowerCase() : "", //"new york",
        }),
        Source: "weather-app",
        DetailType: "weather-report",
      },
    ],
  };

  try {
    console.log("Main Event Bridge Params", JSON.stringify(param));
    let output = await eventBridge.putEvents(param).promise();
    console.log(
      "Main Event Bridge transform successful",
      JSON.stringify(output)
    );
    return {
      statusCode: 200,
      body: JSON.stringify(output),
    };
  } catch (error) {
    console.log("Main Event Bridge transform failed!", JSON.stringify(error));
    return {
      statusCode: 500,
      body: JSON.stringify(error.message),
    };
  }
};
