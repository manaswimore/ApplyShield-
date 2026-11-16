const params=new URLSearchParams(location.search);
const root=document.getElementById("reportContent");
document.getElementById("printBtn").addEventListener("click",()=>window.print());
(async function loadReport(){
  let report;
  if(params.get("demo")==="1"){
    try{report=JSON.parse(localStorage.getItem("applyshieldDemoReport")||"null")}catch{}
  }else if(params.get("id") && window.ApplyShieldAPI.isConfigured()){
    try{
      report=await window.ApplyShieldAPI.getAnalysis(params.get("id"));
      if(report.status==="PROCESSING"){root.innerHTML='<div class="loading-card">Your analysis is still running. Checking again in a moment…</div>';setTimeout(loadReport,2500);return;}
    }catch(e){root.innerHTML=`<div class="loading-card">${escapeHtml(e.message)}<br><br><a class="text-link" href="index.html#analyze">Start another analysis</a></div>`;return;}
  }
  if(!report){root.innerHTML='<div class="loading-card">No report found. <a class="text-link" href="index.html#analyze">Analyze an opportunity</a>.</div>';return;}
  render(report);
})();
function render(r){
  const score=Number(r.riskScore??r.score??0);
  const level=(r.riskLevel||r.risk_level||"LOW").toUpperCase();
  const colors={LOW:"#61d7a2",MODERATE:"#ffb86b",HIGH:"#ff8a5b",CRITICAL:"#ff6478"};
  const color=colors[level]||colors.LOW;
  document.getElementById("reportMeta").textContent=`${r.companyName||r.company_name||"Company not specified"} · ${r.jobTitle||r.job_title||"Role not specified"} · ${new Date(r.createdAt||r.created_at||Date.now()).toLocaleString()}`;
  const findings=r.findings||[];
  const recommendations=r.recommendations||[];
  root.innerHTML=`
  <div class="report-grid">
    <section class="score-card">
      <span class="step-label">RECRUITMENT RISK SCORE</span>
      <div class="score-ring" style="--score:${Math.max(0,Math.min(100,score))}%;--score-color:${color}"><div class="score-value">${score}<small>OUT OF 100</small></div></div>
      <span class="risk-pill" style="color:${color};background:${color}20">${escapeHtml(level)} RISK SIGNALS</span>
      <p>${escapeHtml(r.summary||"Review the findings and verify the opportunity independently.")}</p>
    </section>
    <section class="report-card">
      <h3>Opportunity overview</h3>
      <div class="report-detail">
        <div><span class="step-label">COMPANY</span><p>${escapeHtml(r.companyName||r.company_name||"Not provided")}</p></div>
        <div><span class="step-label">POSITION</span><p>${escapeHtml(r.jobTitle||r.job_title||"Not provided")}</p></div>
        <div><span class="step-label">ANALYSIS STATUS</span><p>${escapeHtml(r.status||"COMPLETED")}</p></div>
        <div><span class="step-label">ASSESSMENT BASIS</span><p>Configured text-pattern indicators; not an external company verification.</p></div>
      </div>
    </section>
    <section class="report-card">
      <h3>Signals detected <span style="color:#9f8bb7;font-size:11px">(${findings.length})</span></h3>
      ${findings.length?findings.map(f=>`<article class="finding" style="--finding-color:${severityColor(f.severity)}"><div class="finding-head"><b>${escapeHtml(f.title||f.name||"Risk signal")}</b><small>${escapeHtml(f.severity||"REVIEW")} · ${Number(f.points||0)} PTS</small></div><p>${escapeHtml(f.reason||f.description||"Review this item carefully.")}</p>${f.evidence?`<span class="evidence">“${escapeHtml(f.evidence)}”</span>`:""}</article>`).join(""):'<p>No configured warning patterns were detected. This does not prove the opportunity is safe or legitimate.</p>'}
    </section>
    <section class="report-card">
      <h3>Your verification checklist</h3>
      <ul class="check-list">${recommendations.map(x=>`<li>${escapeHtml(x)}</li>`).join("")}</ul>
    </section>
  </div>`;
}
function severityColor(s){return ({CRITICAL:"#ff6478",HIGH:"#ff8a5b",MEDIUM:"#ffb86b",LOW:"#7ab8ff"})[(s||"").toUpperCase()]||"#b99aff"}
function escapeHtml(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
