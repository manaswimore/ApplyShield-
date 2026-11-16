const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
exports.handler = async event => {
  const s = event.scoring || {};
  const item = {
    sessionId:event.sessionId,analysisId:event.analysisId,
    companyName:event.companyName||"Company not specified",jobTitle:event.jobTitle||"Role not specified",
    status:"COMPLETED",riskScore:s.riskScore||0,riskLevel:s.riskLevel||"LOW",
    findings:s.findings||[],recommendations:s.recommendations||[],
    verification:event.verification||{},summary:(s.findings||[]).length
      ? `${s.findings.length} configured warning pattern(s) were found. Review each item and verify independently.`
      : "No configured warning patterns were found. This does not establish that the opportunity is legitimate.",
    createdAt:event.createdAt||new Date().toISOString(),expiresAt:event.expiresAt
  };
  await db.send(new UpdateCommand({
    TableName:process.env.TABLE_NAME,Key:{sessionId:item.sessionId,analysisId:item.analysisId},
    UpdateExpression:"SET #status=:status, riskScore=:score, riskLevel=:level, findings=:findings, recommendations=:recommendations, verification=:verification, summary=:summary",
    ExpressionAttributeNames:{"#status":"status"},
    ExpressionAttributeValues:{":status":"COMPLETED",":score":item.riskScore,":level":item.riskLevel,":findings":item.findings,":recommendations":item.recommendations,":verification":item.verification,":summary":item.summary}
  }));
  return {status:"COMPLETED",analysisId:item.analysisId,riskScore:item.riskScore,riskLevel:item.riskLevel};
};