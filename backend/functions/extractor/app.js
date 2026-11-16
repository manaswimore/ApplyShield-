const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const s3 = new S3Client({});
exports.handler = async event => {
  let text = String(event.content || "");
  if (!text && event.evidenceKey) {
    const obj = await s3.send(new GetObjectCommand({Bucket:process.env.EVIDENCE_BUCKET,Key:event.evidenceKey}));
    const type = obj.ContentType || "";
    if (type === "text/plain") text = await obj.Body.transformToString();
    else throw new Error("Server-side extraction for this evidence type is not enabled in the MVP. Paste the message text into the analyzer.");
  }
  if (text.length < 20) throw new Error("No usable recruitment text was supplied.");
  return {...event,normalizedText:text.slice(0,12000)};
};