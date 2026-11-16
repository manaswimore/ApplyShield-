const rules = require("./rules");
function extractEvidence(text, pattern) {
  const match = text.match(pattern);
  if (!match) return "";
  const index = text.toLowerCase().indexOf(match[0].toLowerCase());
  return text.slice(Math.max(0,index-45), Math.min(text.length,index+match[0].length+65)).replace(/\s+/g," ").trim();
}
function analyze(text) {
  const findings = rules.filter(rule => rule.pattern.test(text)).map(rule => ({
    ruleId:rule.id,title:rule.title,severity:rule.severity,points:rule.points,
    evidence:extractEvidence(text,rule.pattern),reason:rule.reason
  }));
  const score = Math.min(100,findings.reduce((sum,f)=>sum+f.points,0));
  const riskLevel = score>=80?"CRITICAL":score>=60?"HIGH":score>=30?"MODERATE":"LOW";
  const recommendations = [];
  if(findings.some(f=>["UPFRONT_PAYMENT","SECURITY_DEPOSIT","TRAINING_FEE"].includes(f.ruleId))) recommendations.push("Do not pay a fee or deposit until you independently confirm the programme with the employer.");
  if(findings.some(f=>f.ruleId==="SENSITIVE_CREDENTIALS")) recommendations.push("Never share OTPs, UPI PINs, banking passwords, or card credentials.");
  if(findings.some(f=>["PERSONAL_EMAIL","WHATSAPP_ONLY"].includes(f.ruleId))) recommendations.push("Find the company's official website yourself and contact its published HR or careers channel.");
  recommendations.push("Check that the role appears on the employer's official careers page.");
  recommendations.push("Verify recruiter identity and email domain independently before sharing documents.");
  if(!findings.length) recommendations.unshift("No configured warning patterns were detected. This does not establish that the opportunity is legitimate.");
  return {riskScore:score,riskLevel,findings,recommendations};
}
module.exports = { analyze };