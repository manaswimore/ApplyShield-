const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { SFNClient, StartExecutionCommand } = require("@aws-sdk/client-sfn");
const crypto = require("crypto");
const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const sfn = new SFNClient({});
const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "http://localhost:5500",
  "Access-Control-Allow-Headers": "Content-Type,Authorization,x-session-id",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Vary": "Origin"
};
exports.handler = async event => {
  try {
    const body = JSON.parse(event.body || "{}");
    const content = String(body.content || "").trim();
    if (content.length < 20 || content.length > 12000) return response(400,{message:"Content must be between 20 and 12,000 characters."});
    const sessionId = String(event.headers?.["x-session-id"] || event.headers?.["X-Session-Id"] || "").trim();
    if (!/^[a-zA-Z0-9_-]{16,80}$/.test(sessionId)) return response(400,{message:"A valid session ID is required."});
    const analysisId = `as_${crypto.randomUUID()}`;
    const item = {
      sessionId,analysisId,companyName:String(body.companyName||"").slice(0,120),
      jobTitle:String(body.jobTitle||"").slice(0,120),status:"PROCESSING",
      evidenceKey:body.evidenceKey||null,createdAt:new Date().toISOString(),
      expiresAt:Math.floor(Date.now()/1000)+60*60*24*30
    };
    await db.send(new PutCommand({TableName:process.env.TABLE_NAME,Item:item}));
    const input = { ...item, content };
    try {
      await sfn.send(new StartExecutionCommand({
        stateMachineArn:process.env.STATE_MACHINE_ARN,
        name:analysisId.replace(/[^a-zA-Z0-9_-]/g,""),
        input:JSON.stringify(input)
      }));
    } catch (startError) {
      console.error("Could not start Step Functions execution:", startError);
      await db.send(new UpdateCommand({
        TableName:process.env.TABLE_NAME,
        Key:{sessionId,analysisId},
        UpdateExpression:"SET #status=:status, failedAt=:failedAt, failureMessage=:message",
        ExpressionAttributeNames:{"#status":"status"},
        ExpressionAttributeValues:{
          ":status":"FAILED",
          ":failedAt":new Date().toISOString(),
          ":message":"The analysis could not be started. Please retry."
        }
      }));
      return response(503,{analysisId,status:"FAILED",message:"The analysis could not be started. Please retry."});
    }
    return response(202,{analysisId,status:"PROCESSING",message:"Your opportunity is being analyzed."});
  } catch(e) { console.error(e); return response(500,{message:"Could not start analysis."}); }
};
function response(statusCode,body){return {statusCode,headers,body:JSON.stringify(body)};}
