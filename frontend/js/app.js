const content = document.getElementById("jobContent");
const count = document.getElementById("charCount");
const fileInput = document.getElementById("evidenceFile");
const fileChip = document.getElementById("fileChip");
const toast = document.getElementById("toast");
let selectedFile = null;

content.addEventListener("input", () => count.textContent = `${content.value.length.toLocaleString()} / 12,000`);
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;
  const allowed = ["image/png","image/jpeg","application/pdf"];
  if (!allowed.includes(file.type)) { showToast("Please choose a PNG, JPG, or PDF file."); fileInput.value=""; return; }
  if (file.size > 5 * 1024 * 1024) { showToast("File must be 5 MB or smaller."); fileInput.value=""; return; }
  selectedFile = file;
  document.getElementById("fileName").textContent = `${file.name} · ${(file.size/1024/1024).toFixed(2)} MB`;
  fileChip.classList.remove("hidden");
});
document.getElementById("removeFile").addEventListener("click", () => {
  selectedFile=null; fileInput.value=""; fileChip.classList.add("hidden");
});
document.getElementById("analyzeBtn").addEventListener("click", async () => {
  const text = content.value.trim();
  if (text.length < 20) { showToast("Add a little more detail so we can analyze the opportunity."); content.focus(); return; }
  const button = document.getElementById("analyzeBtn");
  button.disabled = true; button.innerHTML = "Analyzing opportunity <span class='spinner'></span>";
  try {
    let result;
    if (window.ApplyShieldAPI.isConfigured()) {
      let evidenceKey = null;
      if (selectedFile) {
        const upload = await window.ApplyShieldAPI.getUploadUrl({fileName:selectedFile.name,contentType:selectedFile.type});
        const put = await fetch(upload.uploadUrl,{method:"PUT",headers:{"Content-Type":selectedFile.type},body:selectedFile});
        if (!put.ok) throw new Error("Evidence upload failed.");
        evidenceKey = upload.key;
      }
      result = await window.ApplyShieldAPI.startAnalysis({
        companyName: document.getElementById("companyName").value.trim(),
        jobTitle: document.getElementById("jobTitle").value.trim(),
        sourceType:"job_description", content:text, evidenceKey
      });
      localStorage.setItem("applyshieldCurrentAnalysis", result.analysisId);
      window.location.href = `report.html?id=${encodeURIComponent(result.analysisId)}`;
      return;
    } else {
      result = analyzeLocally({
        companyName: document.getElementById("companyName").value.trim(),
        jobTitle: document.getElementById("jobTitle").value.trim(),
        content:text
      });
      localStorage.setItem("applyshieldDemoReport", JSON.stringify(result));
      window.location.href = "report.html?demo=1";
    }
  } catch (error) {
    showToast(error.message || "Something went wrong. Please try again.");
    button.disabled=false; button.innerHTML="Analyze this opportunity <span>→</span>";
  }
});

function analyzeLocally(input) {
  const text = input.content;
  const rules = [
    {id:"SENSITIVE_CREDENTIALS",title:"Sensitive credentials requested",severity:"CRITICAL",points:30,pattern:/\b(otp|one.time.password|bank password|upi pin|atm pin)\b/i,reason:"Recruiters should never ask for OTPs, banking passwords, UPI PINs, or ATM PINs."},
    {id:"UPFRONT_PAYMENT",title:"Upfront registration or application fee",severity:"HIGH",points:25,pattern:/\b(registration fee|pay\s*(₹|rs\.?|inr)?\s*\d+|application fee|processing fee)\b/i,reason:"A request to pay money to secure a job or internship warrants independent verification."},
    {id:"SECURITY_DEPOSIT",title:"Security deposit requested",severity:"HIGH",points:25,pattern:/\b(security deposit|refundable deposit|deposit amount)\b/i,reason:"A deposit tied to selection or onboarding can be a warning sign. Verify directly with the employer."},
    {id:"TRAINING_FEE",title:"Mandatory paid training",severity:"HIGH",points:20,pattern:/\b(training fee|pay.*training|paid training.*mandatory)\b/i,reason:"Check whether training charges are genuinely part of an official programme."},
    {id:"GUARANTEED_SELECTION",title:"Guaranteed selection language",severity:"MEDIUM",points:15,pattern:/\b(guaranteed selection|100%\s*selected|no interview|direct selection)\b/i,reason:"Promises of selection without a meaningful assessment may be misleading."},
    {id:"URGENCY",title:"Urgency or pressure language",severity:"MEDIUM",points:10,pattern:/\b(within \d+ hours|pay immediately|limited seats|last chance|urgent payment)\b/i,reason:"Pressure to act quickly can discourage careful verification."},
    {id:"PERSONAL_EMAIL",title:"Generic email provider mentioned",severity:"LOW",points:8,pattern:/\b(gmail\.com|yahoo\.com|outlook\.com|hotmail\.com)\b/i,reason:"A generic email address is not proof of fraud, but the sender's identity should be verified through the company's official website."},
    {id:"WHATSAPP_ONLY",title:"Recruitment directed to WhatsApp",severity:"LOW",points:7,pattern:/\b(whatsapp only|contact.*whatsapp|message.*whatsapp)\b/i,reason:"WhatsApp may be used legitimately, but verify the recruiter through an independently sourced company contact."},
    {id:"UNREALISTIC_PROMISE",title:"Unusually strong earning promise",severity:"MEDIUM",points:10,pattern:/\b(earn\s*(₹|rs\.?)?\s*\d{2,}.*daily|no experience.*high salary|easy money)\b/i,reason:"Compare the compensation and responsibilities with credible listings for similar roles."}
  ];
  const findings = rules.filter(rule => rule.pattern.test(text)).map(rule => ({
    ruleId:rule.id,title:rule.title,severity:rule.severity,points:rule.points,
    evidence:extractEvidence(text,rule.pattern),reason:rule.reason
  }));
  const score = Math.min(100,findings.reduce((sum,item)=>sum+item.points,0));
  const riskLevel = score>=80?"CRITICAL":score>=60?"HIGH":score>=30?"MODERATE":"LOW";
  const recommendations = [];
  if(findings.some(f=>["UPFRONT_PAYMENT","SECURITY_DEPOSIT","TRAINING_FEE"].includes(f.ruleId))) recommendations.push("Do not pay any fee or deposit until you independently confirm the programme with the employer.");
  if(findings.some(f=>f.ruleId==="SENSITIVE_CREDENTIALS")) recommendations.push("Never share OTPs, UPI PINs, banking passwords, or card credentials.");
  if(findings.some(f=>["PERSONAL_EMAIL","WHATSAPP_ONLY"].includes(f.ruleId))) recommendations.push("Find the company's official website yourself and contact its published HR or careers channel.");
  recommendations.push("Check that the role appears on the employer's official careers page.");
  recommendations.push("Verify the recruiter identity and email domain independently before sharing documents.");
  recommendations.push("Keep a copy of the job post and all recruitment communications.");
  if(!findings.length) recommendations.unshift("No configured warning patterns were detected. This does not establish that the opportunity is legitimate.");
  return {
    analysisId:`demo_${Date.now()}`,status:"COMPLETED",companyName:input.companyName||"Company not specified",
    jobTitle:input.jobTitle||"Role not specified",riskScore:score,riskLevel,findings,recommendations,
    createdAt:new Date().toISOString(),mode:"DEMO",
    summary:findings.length?`${findings.length} configured warning pattern(s) were found in the supplied text. Review each item and verify independently.`:"No configured warning patterns were found in the supplied text. Absence of detected signals is not proof of legitimacy."
  };
}
function extractEvidence(text,pattern) {
  const match=text.match(pattern); if(!match) return "";
  const index=text.toLowerCase().indexOf(match[0].toLowerCase());
  return text.slice(Math.max(0,index-45),Math.min(text.length,index+match[0].length+65)).replace(/\s+/g," ").trim();
}
function showToast(message){toast.textContent=message;toast.classList.add("show");setTimeout(()=>toast.classList.remove("show"),2800)}
