const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, UpdateCommand } = require("@aws-sdk/lib-dynamodb");

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));

exports.handler = async event => {
  if (!event.sessionId || !event.analysisId) {
    console.error("Failure handler received an event without its analysis key.");
    return { status: "FAILED", persisted: false };
  }

  const failedAt = new Date().toISOString();
  try {
    await db.send(new UpdateCommand({
      TableName: process.env.TABLE_NAME,
      Key: { sessionId: event.sessionId, analysisId: event.analysisId },
      UpdateExpression: "SET #status = :status, failedAt = :failedAt, failureMessage = :message",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: {
        ":status": "FAILED",
        ":failedAt": failedAt,
        ":message": "The analysis workflow could not be completed. Please retry."
      }
    }));
    return { status: "FAILED", analysisId: event.analysisId, persisted: true };
  } catch (error) {
    console.error("Could not persist failed analysis status:", error);
    throw error;
  }
};
