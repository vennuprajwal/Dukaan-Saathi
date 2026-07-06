/* Tiny fetch wrapper. Dev requests go through Vite's proxy to the Express
   backend (see vite.config.js). Attaches the JWT when present. */
const TOKEN_KEY = "dukaan_token";

// Token helpers support persistent (localStorage) or session-only (sessionStorage)
export const getToken = () => sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
export const setToken = (t, persist = true) => {
  // remove any previous copies
  sessionStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_KEY);
  if (persist) localStorage.setItem(TOKEN_KEY, t);
  else sessionStorage.setItem(TOKEN_KEY, t);
};
export const clearToken = () => {
  sessionStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_KEY);
};

async function request(path, { method = "GET", body, auth = true, form } = {}) {
  const headers = {};
  if (auth && getToken()) headers.Authorization = `Bearer ${getToken()}`;
  let payload = form;
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  const res = await fetch(`/api${path}`, { method, headers, body: payload });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  health: () => request("/health", { auth: false }),
  register: (payload) => request("/auth/register", { method: "POST", body: payload, auth: false }),
  login: (payload) => request("/auth/login", { method: "POST", body: payload, auth: false }),
  dashboard: () => request("/dashboard/dashboard"),
  collect: (customer_id, amount) =>
    request("/dashboard/payments", { method: "POST", body: { customer_id, amount } }),
  addExpense: (amount, category, note) =>
    request("/dashboard/expenses", { method: "POST", body: { amount, category, note } }),
  setLang: (lang) => request("/dashboard/lang", { method: "POST", body: { lang } }),

  // Simulator (auth optional — falls back to a demo shop or an explicit number)
  simMessage: (text, number) =>
    request("/simulate/message", { method: "POST", body: { text, number }, auth: true }),
  simVoice: (audioBlob, number) => {
    const fd = new FormData();
    fd.append("audio", audioBlob, "note.webm");
    if (number) fd.append("number", number);
    return request("/simulate/voice", { method: "POST", form: fd, auth: true });
  },
};
