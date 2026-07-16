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

function buildQuery(params = {}) {
  const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== "" && value !== null);
  return entries.length ? `?${entries.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join("&")}` : "";
}

let onUnauthorized = null;
export const setUnauthorizedCallback = (cb) => {
  onUnauthorized = cb;
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
  if (!res.ok) {
    if (res.status === 401) {
      // Session expired or invalid – clear stored token
      clearToken();
      if (onUnauthorized) onUnauthorized();
    }
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  health: () => request("/health", { auth: false }),
  register: (payload) => request("/auth/register", { method: "POST", body: payload, auth: false }),
  login: (payload) => request("/auth/login", { method: "POST", body: payload, auth: false }),
  googleLogin: (payload) => request("/auth/google", { method: "POST", body: payload, auth: false }),
  resetPin: (payload) => request("/auth/reset-pin", { method: "POST", body: payload, auth: false }),
  // Update shop profile (supports multipart for logo upload)
  updateProfile: async (data) => {
    // If a logo File is present, use FormData; otherwise send JSON
    if (data && data.shop_logo instanceof File) {
      const form = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) form.append(key, value);
      });
      return request("/auth/profile", { method: "PUT", form, auth: true });
    }
    return request("/auth/profile", { method: "PUT", body: data, auth: true });
  },
  // Change password for the logged‑in shop owner
  changePassword: (payload) => request("/auth/change-password", { method: "POST", body: payload, auth: true }),
  dashboard: () => request("/dashboard/dashboard"),
  collect: (customer_id, amount, payment_method, txn_ref, upi_id) =>
    request("/dashboard/payments", { method: "POST", body: { customer_id, amount, payment_method, txn_ref, upi_id } }),
  addExpense: (amount, category, note) =>
    request("/dashboard/expenses", { method: "POST", body: { amount, category, note } }),
  addSale: (sale) => request("/dashboard/sales", { method: "POST", body: sale }),
  deleteSale: (id) => request(`/dashboard/sales/${id}`, { method: "DELETE" }),
  setLang: (lang) => request("/dashboard/lang", { method: "POST", body: { lang } }),
  loadDemo: () => request("/dashboard/demo", { method: "POST", body: {} }),
  resetData: () => request("/dashboard/reset", { method: "POST", body: {} }),
  connectShop: (recipient_shop_id) => request("/connections/request", { method: "POST", body: { recipient_shop_id } }),
  respondConnection: (request_id, action) => request("/connections/respond", { method: "POST", body: { request_id, action } }),
  // CSV export: returns a Blob so the caller can trigger a download.
  exportCsv: async () => {
    const res = await fetch("/api/dashboard/export", {
      headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
    });
    if (!res.ok) throw new Error(`Export failed (${res.status})`);
    return res.blob();
  },

  // Simulator (auth optional — falls back to a demo shop or an explicit number)
  simMessage: (text, number, lang) =>
    request("/ai/message", { method: "POST", body: { text, number, lang }, auth: true }),
  simVoice: (audioBlob, number, lang) => {
    const fd = new FormData();
    fd.append("audio", audioBlob, "note.webm");
    if (number) fd.append("number", number);
    if (lang) fd.append("lang", lang);
    return request("/ai/voice", { method: "POST", form: fd, auth: true });
  },
  simScan: (imageFile) => {
    const fd = new FormData();
    fd.append("image", imageFile);
    return request("/ai/scan", { method: "POST", form: fd, auth: true });
  },
  simScanApply: (entries) => request("/ai/scan/apply", { method: "POST", body: { entries }, auth: true }),

  getProfile: () => request("/auth/profile"),
  listShops: () => request("/auth/shops"),
  getDirectory: () => request("/auth/directory"),
  createShop: (payload) => request("/auth/shops", { method: "POST", body: payload }),
  listCreditInvoices: () => request("/credit/invoices"),
  createCreditInvoice: (payload) => request("/credit/invoices", { method: "POST", body: payload }),
  updateCreditInvoice: (id, payload) => request(`/credit/invoices/${id}`, { method: "PUT", body: payload }),
  payCreditInvoice: (id, amount) => request(`/credit/invoices/${id}/pay`, { method: "POST", body: { amount } }),
  listNotifications: () => request("/credit/notifications"),
  getNotificationCenter: (params = {}) => request(`/credit/notifications-center${buildQuery(params)}`),
  markNotificationRead: (id) => request(`/credit/notifications/${id}/read`, { method: "POST" }),
  deleteNotification: (id) => request(`/credit/notifications/${id}`, { method: "DELETE" }),
  getCustomers: (q) => request(`/dashboard/customers${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  createCustomer: (payload) => request("/dashboard/customers", { method: "POST", body: payload }),
  getLedgerList: () => request("/dashboard/ledger"),
  getLedgerDetail: (customerId) => request(`/dashboard/ledger/${customerId}`),
  getReminderHistory: () => request("/dashboard/reminders/history"),
  sendReminder: (payload) => request("/dashboard/reminders/send", { method: "POST", body: payload }),
  sendBulkReminders: (payload) => request("/dashboard/reminders/send-all", { method: "POST", body: payload }),
  // Customer CRUD
  updateCustomer: (id, payload) => request(`/dashboard/customers/${id}`, { method: "PUT", body: payload }),
  deleteCustomer: (id) => request(`/dashboard/customers/${id}`, { method: "DELETE" }),
};
