/* ApplyShield API adapter.
   Set API_BASE to your deployed API Gateway URL after SAM deployment.
   This browser-generated session token is a demo-level capability token, not full user authentication.
*/
window.ApplyShieldAPI = (() => {
  const API_BASE = "https://ai3yf60c0k.execute-api.ap-south-1.amazonaws.com/prod";
  const SESSION_KEY = "applyshieldSessionId";
  let sessionId = localStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`);
    localStorage.setItem(SESSION_KEY, sessionId);
  }
  async function request(path, options = {}) {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "x-session-id": sessionId,
        ...(options.headers || {})
      }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || `Request failed (${response.status})`);
    return data;
  }
  return {
    isConfigured: () => Boolean(API_BASE),
    startAnalysis: (payload) => request("/analyses", { method: "POST", body: JSON.stringify(payload) }),
    getAnalysis: (id) => request(`/analyses/${encodeURIComponent(id)}`),
    listAnalyses: () => request("/analyses"),
    getUploadUrl: (payload) => request("/uploads/presign", { method: "POST", body: JSON.stringify(payload) })
  };
})();