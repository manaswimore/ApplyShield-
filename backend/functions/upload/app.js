const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const crypto = require("crypto");
const s3 = new S3Client({});
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
    const allowed = {"image/png":"png","image/jpeg":"jpg","application/pdf":"pdf"};
    if (!allowed[body.contentType]) return response(400,{message:"Unsupported file type."});
    const safeName = String(body.fileName || "evidence").replace(/[^a-zA-Z0-9._-]/g,"_").slice(0,90);
    const key = `uploads/${crypto.randomUUID()}-${safeName}`;
    const command = new PutObjectCommand({Bucket:process.env.EVIDENCE_BUCKET,Key:key,ContentType:body.contentType});
    const uploadUrl = await getSignedUrl(s3,command,{expiresIn:300});
    return response(200,{uploadUrl,key,expiresIn:300});
  } catch(e) { console.error(e); return response(500,{message:"Could not create upload URL."}); }
};
function response(statusCode,body){return {statusCode,headers,body:JSON.stringify(body)};}
