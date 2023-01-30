const db = require("../db/todo");
const {
  GetItemCommand,
  PutItemCommand,
  UpdateItemCommand,
  DeleteItemCommand,
  QueryCommand
} = require("@aws-sdk/client-dynamodb");
const { marshall, unmarshall } = require("@aws-sdk/util-dynamodb");

const TableName = process.env.DYNAMODB_TABLE_NAME;

const getNote = async (event, context, callback) => {
  // Optimization
  // This flag is to avoid latency happened due to processing promises and callback by Node Event Loop FW
  context.callbackWaitsForEmptyEventLoop = false;

  const { noteId } = event.pathParameters;
  try {
    const params = {
      TableName,
      Key: marshall({ noteId: parseInt(noteId, 10) }),
    };
    const { Item } = await db.send(new GetItemCommand(params));
    console.log(`GET Note by ID: ${noteId} is ${Item}`);

    const response = {
      message: "Note retrieved successfully.",
      data: Item ? unmarshall(Item) : {},
    };
    callback(null, send(200, response));
  } catch (error) {
    console.log(
      `An error occurred while fetching note by ID: ${noteId}`,
      error
    );
    const response = {
      message: `Failed to fetch note by ID: ${noteId}`,
      errorMsg: error.message,
      errorStack: error.stack,
    };
    callback(null, send(500, response));
  }
};

const getAllNotesByUser = async (event, context, callback) => {
  // Optimization
  // This flag is to avoid latency happened due to processing promises and callback by Node Event Loop FW
  context.callbackWaitsForEmptyEventLoop = false;

  const { userId } = event.pathParameters;
  console.log(event.pathParameters);
  try {
    const params = {
      TableName,
      KeyConditionExpression: "#userId = :userId",
      ExpressionAttributeNames: {
        "#userId": "userId"
      },
      ExpressionAttributeValues: {
        ":userId": {N: userId},
      },
    };
    console.log(params);
    const result = await db.send(new QueryCommand(params));
    console.log(`GET Note by User ID: ${userId} is ${result}`);

    const response = {
      message: "Notes retrieved successfully.",
      data: result ? unmarshall(result) : {},
    };
    callback(null, send(200, response));
  } catch (error) {
    console.log(
      `An error occurred while fetching notes by User ID: ${userId}`,
      error
    );
    const response = {
      message: `Failed to fetch notes by User ID: ${userId}`,
      errorMsg: error.message,
      errorStack: error.stack,
    };
    callback(null, send(500, response));
  }
};

const createNote = async (event, context, callback) => {
  // Optimization
  // This flag is to avoid latency happened due to processing promises and callback by Node Event Loop FW
  context.callbackWaitsForEmptyEventLoop = false;

  const body = JSON.parse(event.body);
  try {
    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Item: marshall(body),
    };
    const result = await db.send(new PutItemCommand(params));
    console.log(`Note created successfully by ID ${body.noteId}`);
    const response = {
      message: "Note created successfully.",
      data: result,
    };
    callback(null, send(201, response));
  } catch (error) {
    console.log(
      `An error occurred while creating note by ID: ${body.noteId}`,
      error
    );
    const response = {
      message: `Failed to create note by ID: ${body.noteId}`,
      errorMsg: error.message,
      errorStack: error.stack,
    };
    callback(null, send(500, response));
  }
};

const updateNote = async (event, context, callback) => {
  // Optimization
  // This flag is to avoid latency happened due to processing promises and callback by Node Event Loop FW
  context.callbackWaitsForEmptyEventLoop = false;

  const body = JSON.parse(event.body);
  const { noteId } = event.pathParameters;
  const objKeys = Object.keys(body);

  // SET #key0 =:value0, #key1 =:value1, #key2 =:value2, #key3 =:value3
  const updateExpression = `SET ${objKeys
    .map((_, index) => `#key${index} =:value${index}`)
    .join(", ")}`;

  // {
  //   '#key0': 'userId',
  //   '#key1': 'noteId',
  //   '#key2': 'title',
  //   '#key3': 'completed'
  // }
  const expressionAttributeNames = objKeys.reduce(
    (acc, key, index) => ({ ...acc, [`#key${index}`]: key }),
    {}
  );

  // { ':value0': 1, ':value1': 3, ':value2': 'Relax', ':value3': true }
  const expressionAttributesValues = objKeys.reduce(
    (acc, key, index) => ({
      ...acc,
      [`:value${index}`]: body[key],
    }),
    {}
  );
  try {
    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Key: marshall({ noteId: parseInt(noteId, 10) }),
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: marshall(expressionAttributesValues),
    };
    const result = await db.send(new UpdateItemCommand(params));
    console.log(`Note update successfully by ID ${noteId}`);
    const response = {
      message: "Note updated successfully.",
      data: result,
    };
    callback(null, send(201, response));
  } catch (error) {
    console.log(
      `An error occurred while updating note by ID: ${noteId}`,
      error
    );
    const response = {
      message: `Failed to update note by ID: ${noteId}`,
      errorMsg: error.message,
      errorStack: error.stack,
    };
    callback(null, send(500, response));
  }
};

const deleteNote = async (event, context, callback) => {
  // Optimization
  // This flag is to avoid latency happened due to processing promises and callback by Node Event Loop FW
  context.callbackWaitsForEmptyEventLoop = false;

  const { noteId } = event.pathParameters;
  try {
    const params = {
      TableName,
      Key: marshall({ noteId: parseInt(noteId, 10) }),
    };
    const result = await db.send(new DeleteItemCommand(params));
    console.log(`Note deleted successfully by ID: ${noteId}`);

    const response = {
      message: "Note deleted successfully.",
      data: result,
    };
    callback(null, send(200, response));
  } catch (error) {
    console.log(
      `An error occurred while deleting note by ID: ${noteId}`,
      error
    );
    const response = {
      message: `Failed to delete note by ID: ${noteId}`,
      errorMsg: error.message,
      errorStack: error.stack,
    };
    callback(null, send(500, response));
  }
};

const send = (statusCode, response) => ({
  statusCode,
  body: JSON.stringify(response),
});

module.exports = {
  getNote,
  createNote,
  updateNote,
  deleteNote,
  getAllNotesByUser,
};
