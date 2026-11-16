exports.handler = async event => {
  const detection = event.detection || {};
  const findings = detection.findings || [];
  const score = Math.min(100,findings.reduce((sum,f)=>sum+Number(f.points||0),0));
  const riskLevel = score>=80?"CRITICAL":score>=60?"HIGH":score>=30?"MODERATE":"LOW";
  return {...event,scoring:{riskScore:score,riskLevel,findings,recommendations:detection.recommendations||[]}};
};