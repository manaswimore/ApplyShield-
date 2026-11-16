const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand, QueryCommand } = require("@aws-sdk/lib-dynamodb");
const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "http://localhost:5500",
  "Access-Control-Allow-Headers": "Content-Type,Authorization,x-session-id",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Vary": "Origin"
};
exports.handler = async event => {
  try {
    const sessionId = String(event.headers?.["x-session-id"] || event.headers?.["X-Session-Id"] || "").trim();
    if (!/^[a-zA-Z0-9_-]{16,80}$/.test(sessionId)) return response(400,{message:"A valid session ID is required."});
    if (event.pathParameters?.id) {
      const result = await db.send(new GetCommand({TableName:process.env.TABLE_NAME,Key:{sessionId,analysisId:event.pathParameters.id}}));
      if (!result.Item) return response(404,{message:"Report not found."});
      return response(200,result.Item);
    }
    const result = await db.send(new QueryCommand({TableName:process.env.TABLE_NAME,KeyConditionExpression:"sessionId = :sid",ExpressionAttributeValues:{":sid":sessionId},ScanIndexForward:false,Limit:20}));
    return response(200,{items:result.Items||[]});
  } catch(e) { console.error(e); return response(500,{message:"Could not retrieve analysis."}); }
};
function response(statusCode,body){return {statusCode,headers,body:JSON.stringify(body)};}
