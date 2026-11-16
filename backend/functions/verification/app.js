exports.handler = async event => {
  const text = String(event.normalizedText || "");
  const gaps = [];
  if (!event.companyName) gaps.push({id:"COMPANY_NOT_PROVIDED",message:"Company name was not provided; independent identity verification is not possible from this input."});
  if (!/\b(https?:\/\/|www\.)/i.test(text)) gaps.push({id:"NO_COMPANY_URL",message:"No company website URL was included in the supplied text."});
  if (!/\b(interview|technical round|assessment|selection process)\b/i.test(text)) gaps.push({id:"PROCESS_UNCLEAR",message:"The recruitment process is not clearly described in the supplied text."});
  return {...event,verification:{status:"NOT_EXTERNALLY_VERIFIED",gaps,note:"These are verification gaps, not proof that the employer is illegitimate."}};
};