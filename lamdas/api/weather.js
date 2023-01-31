const axios = require("axios");
const db = require("../db/todo");
const {
  PutItemCommand,
  UpdateItemCommand,
  GetItemCommand,
  ScanCommand
} = require("@aws-sdk/client-dynamodb");
const { marshall, unmarshall } = require("@aws-sdk/util-dynamodb");

module.exports.dequeue = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  const records = event.Records;
  const batchItemFailure = [];
  for (const record of records) {
    try {
      const parsedBody = JSON.parse(record.body);
      console.log("Weather Target SQS Body", parsedBody);
      const city = parsedBody.detail.city;
      if (
        (!city && city.length < 1) ||
        typeof parsedBody.detail.city !== "string"
      ) {
        throw new Error("Weather Target SQS Error - Invalid city");
      }
      console.log("Processing City ...", city);

      // Get Weather Api,persist data to DB
      const weatherReport = await axios.get(
        `http://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&APPID=08e3ad0437282f0abefa56ee74ab56af`
      );
      const cityWeather = `Temperature - ${weatherReport.data.main.temp}°C. Humidity - ${weatherReport.data.main.humidity}%. ${weatherReport.data.weather[0].description} is expected`;
      console.log(cityWeather);

      // Verify if Weather already exists for the city
      const getWeatherDataParams = {
        TableName: process.env.WEATHER_TABLE_NAME,
        Key: marshall({ city: city }),
      };
      console.log("getWeatherDataParams", getWeatherDataParams);
      const { Item } = await db.send(new GetItemCommand(getWeatherDataParams));
      console.log(
        "Weather from Weather Table",
        Item ? JSON.stringify(unmarshall(Item)) : {}
      );
      if (Item) {
        console.log(
          "Weather exists for city",
          city,
          JSON.stringify(unmarshall(Item))
        );

        const updateWeatherDataParams = {
          TableName: process.env.WEATHER_TABLE_NAME,
          Key: marshall({ city: city }),
          UpdateExpression: `set #temperature= :temperature, #humidity= :humidity, #description= :description`,
          ExpressionAttributeNames: {
            "#temperature": "temperature",
            "#humidity": "humidity",
            "#description": "description",
          },
          ExpressionAttributeValues: marshall({
            ":temperature": weatherReport.data.main.temp,
            ":humidity": weatherReport.data.main.humidity,
            ":description": weatherReport.data.weather[0].description,
          }),
        };
        console.log("updateWeatherDataParams", updateWeatherDataParams);
        const result = await db.send(
          new UpdateItemCommand(updateWeatherDataParams)
        );
        const response = {
          message: "Weather data updated successfully",
          param: updateWeatherDataParams,
          data: result,
        };
        console.log(response);
      } else {
        console.log("Weather does not exist for city", city);

        const createWeatherDataParams = {
          TableName: process.env.WEATHER_TABLE_NAME,
          Item: marshall({
            city: city,
            temperature: weatherReport.data.main.temp,
            humidity: weatherReport.data.main.humidity,
            description: weatherReport.data.weather[0].description,
          }),
        };
        console.log("createWeatherDataParams", createWeatherDataParams);
        const result = await db.send(
          new PutItemCommand(createWeatherDataParams)
        );

        const response = {
          message: "Weather data saved successfully.",
          param: createWeatherDataParams,
          data: result,
        };

        console.log(response);
      }
    } catch (error) {
      console.log("Weather Target SQS Errors", error);
      batchItemFailure.push({
        itemIdentifier: record.messageId,
      });
    }
  }
  console.log(
    "Weather Target SQS Batch Failures",
    JSON.stringify(batchItemFailure)
  );
  return { batchItemFailure };
};

module.exports.getAllCitiesWeather = async (_event, context, callback) => {
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    const { Items } = await db.send(
      new ScanCommand({ TableName: process.env.WEATHER_TABLE_NAME })
    );

    const data = {
      message: "Successfully retrieved weather for all cities",
      data: Items.map((item) => unmarshall(item)),
      Items,
    };
    callback(null, send(200, data));
  } catch (e) {
    console.error("Error retrieving weather", e);
    const error = {
      message: "Failed to retrieve weather report",
      errorMsg: e.message,
      errorStack: e.stack,
    };
    callback(null, send(500, error));
  }

  return response;
};

const send = (statusCode, response) => ({
  statusCode,
  body: JSON.stringify(response),
});
