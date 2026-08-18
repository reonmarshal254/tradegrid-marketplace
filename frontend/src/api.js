const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function getToken() {
  return localStorage.getItem('sh_token');
}

export function setToken(token) {
  if (token) localStorage.setItem('sh_token', token);
  else localStorage.removeItem('sh_token');
}

export function getAuthHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, { method = 'GET', body, isForm = false } = {}) {
  const headers = getAuthHeaders();
  if (API_BASE.includes('ngrok-free.app')) {
    headers['ngrok-skip-browser-warning'] = 'true';
  }
  let payload;
  if (isForm) {
    payload = body;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const res = await fetch(`${API_BASE}/api${path}`, {
    method,
    headers,
    body: payload,
    cache: 'no-store',
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* no body */
  }

  if (!res.ok) {
    const message = data?.error?.message || `Request failed (${res.status})`;
    throw new ApiError(message, res.status, data?.error?.details);
  }
  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body, isForm = false) => request(path, { method: 'POST', body, isForm }),
  put: (path, body, isForm = false) => request(path, { method: 'PUT', body, isForm }),
  delete: (path) => request(path, { method: 'DELETE' }),

  auth: {
    register: (data) => request('/auth/register', { method: 'POST', body: data }),
    login: (data) => request('/auth/login', { method: 'POST', body: data }),
    google: (data) => request('/auth/google', { method: 'POST', body: data }),
    me: () => request('/auth/me'),
    updateProfile: (data, isForm = false) =>
      request('/auth/me', { method: 'PUT', body: data, isForm }),
    verifyEmail: (email, otp) => request('/auth/verify-email', { method: 'POST', body: { email, otp } }),
    resendVerification: (email) =>
      request('/auth/resend-verification', { method: 'POST', body: { email } }),
    forgotPassword: (email) =>
      request('/auth/forgot-password', { method: 'POST', body: { email } }),
    resetPassword: (otp, password) =>
      request('/auth/reset-password', { method: 'POST', body: { otp, password } }),
  },

  items: {
    list: (params = {}) => {
      const qs = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') qs.set(k, v);
      });
      const str = qs.toString();
      return request(`/items${str ? `?${str}` : ''}`);
    },
    categories: () => request('/items/categories'),
    favorites: () => request('/items/favorites'),
    recentlyViewed: () => request('/items/recently-viewed'),
    myStats: () => request('/items/my-stats'),
    get: (id) => request(`/items/${id}`),
    my: (status) =>
      request(`/items/my${status ? `?status=${status}` : ''}`),
    searchSuggestions: (q) => request(`/items/search-suggestions?q=${encodeURIComponent(q)}`),
    nearby: (radius = 50, limit = 12) => request(`/items/nearby?radius=${radius}&limit=${limit}`),
    create: (formData) => request('/items', { method: 'POST', body: formData, isForm: true }),
    update: (id, formData) =>
      request(`/items/${id}`, { method: 'PUT', body: formData, isForm: true }),
    remove: (id) => request(`/items/${id}`, { method: 'DELETE' }),
    sold: (id) => request(`/items/${id}/sold`, { method: 'POST' }),
    react: (id) => request(`/items/${id}/react`, { method: 'POST' }),
    view: (id) => request(`/items/${id}/view`, { method: 'POST' }),
    purchased: (id) => request(`/items/${id}/purchased`, { method: 'POST' }),
    review: (id, body) => request(`/items/${id}/review`, { method: 'POST', body }),
  },

    account: {
      activity: () => request('/account/activity'),
      settings: () => request('/account/settings'),
      updateSettings: (settings) =>
        request('/account/settings', { method: 'PUT', body: { settings } }),
      changeEmail: (new_email) =>
        request('/account/change-email', { method: 'POST', body: { new_email } }),
      verifyEmailChange: (token) =>
        request('/account/verify-email-change', { method: 'POST', body: { token } }),
      searchHistory: () => request('/account/search-history'),
      addSearchHistory: (query) =>
        request('/account/search-history', { method: 'POST', body: { query } }),
      removeSearchHistory: (id) =>
        request(`/account/search-history/${id}`, { method: 'DELETE' }),
      clearSearchHistory: () =>
        request('/account/search-history', { method: 'DELETE' }),
      feedback: (body) => request('/account/feedback', { method: 'POST', body }),
      report: (body) => request('/account/report', { method: 'POST', body }),
      supportTickets: () => request('/account/support'),
      submitSupport: (body) => request('/account/support', { method: 'POST', body }),
    },

    messages: {
      conversations: () => request('/messages/conversations'),
      start: (item_id, user_id) =>
        request('/messages/conversations', { method: 'POST', body: { item_id, user_id } }),
      get: (id) => request(`/messages/conversations/${id}`),
      send: (id, body) =>
        request(`/messages/conversations/${id}/messages`, { method: 'POST', body: { body } }),
      unreadCount: () => request('/messages/unread-count'),
    },

    admin: {
      stats: () => request('/admin/stats'),
      activity: () => request('/admin/activity'),
      reports: () => request('/admin/reports'),
      resolveReport: (id) => request(`/admin/reports/${id}`, { method: 'PATCH', body: { status: 'resolved' } }),
      insights: () => request('/admin/insights'),
      users: () => request('/admin/users'),
      updateUser: (id, body) => request(`/admin/users/${id}`, { method: 'PATCH', body }),
      deleteUser: (id) => request(`/admin/users/${id}`, { method: 'DELETE' }),
      items: () => request('/admin/items'),
      updateItem: (id, body) => request(`/admin/items/${id}`, { method: 'PATCH', body }),
      deleteItem: (id) => request(`/admin/items/${id}`, { method: 'DELETE' }),
      support: () => request('/admin/support'),
      supportTickets: () => request('/admin/support'),
      replySupport: (id, reply) =>
        request(`/admin/support/${id}/reply`, { method: 'POST', body: { reply } }),
      closeSupportTicket: (id) => request(`/admin/support/${id}/close`, { method: 'PATCH' }),
      // Advertisement management
      advertisements: () => request('/admin/advertisements'),
      updateAdvertisement: (id, body) => request(`/admin/advertisements/${id}`, { method: 'PATCH', body }),
      deleteAdvertisement: (id) => request(`/admin/advertisements/${id}`, { method: 'DELETE' }),
      // App version management
      appVersions: () => request('/admin/app-versions'),
      createAppVersion: (formData) =>
        request('/admin/app-versions', { method: 'POST', body: formData, isForm: true }),
      deleteAppVersion: (id) => request(`/admin/app-versions/${id}`, { method: 'DELETE' }),
      latestAppVersion: () => request('/app-version/latest'),
      supportChats: (status) => request(`/support-chat/admin/chats${status ? `?status=${status}` : ''}`),
      getSupportChat: (id) => request(`/support-chat/admin/chats/${id}`),
      supportChatUnread: () => request('/support-chat/admin/unread-count'),
    },

    supportChat: {
      getMyChat: () => request('/support-chat/my-chat'),
      sendMessage: (chatId, body) =>
        request(`/support-chat/${chatId}/messages`, { method: 'POST', body: { body } }),
      closeChat: (chatId) =>
        request(`/support-chat/${chatId}/close`, { method: 'POST' }),
    },

  announcements: {
    listActive: () => request('/announcements/active'),
    listAll: () => request('/announcements'),
    get: (id) => request(`/announcements/${id}`),
    create: (body) => request('/announcements', { method: 'POST', body }),
    update: (id, body) => request(`/announcements/${id}`, { method: 'PUT', body }),
    delete: (id) => request(`/announcements/${id}`, { method: 'DELETE' }),
    toggle: (id) => request(`/announcements/${id}/toggle`, { method: 'PATCH' }),
  },

  advertisements: {
    create: (formData) => request('/advertisements', { method: 'POST', body: formData, isForm: true }),
    list: (params = {}) => {
      const qs = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') qs.set(k, v);
      });
      const str = qs.toString();
      return request(`/advertisements/my-ads${str ? `?${str}` : ''}`);
    },
    getMyAds: (params = {}) => {
      const qs = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') qs.set(k, v);
      });
      const str = qs.toString();
      return request(`/advertisements/my-ads${str ? `?${str}` : ''}`);
    },
    getApproved: (params = {}) => {
      const qs = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') qs.set(k, v);
      });
      const str = qs.toString();
      return request(`/advertisements/approved${str ? `?${str}` : ''}`);
    },
    getFeaturedVideo: () => request('/advertisements/featured-video'),
    recordView: (id) => request(`/advertisements/${id}/view`, { method: 'POST' }),
    recordClick: (id) => request(`/advertisements/${id}/click`, { method: 'POST' }),
    getAnalytics: (id) => request(`/advertisements/${id}/analytics`),
  },

  notifications: {
    list: (page = 1) => request(`/notifications?page=${page}`),
    unreadCount: () => request('/notifications/unread-count'),
    read: (id) => request(`/notifications/${id}/read`, { method: 'POST' }),
    readAll: () => request('/notifications/read-all', { method: 'POST' }),
    readBulk: (ids) => request('/notifications/read', { method: 'POST', body: { ids } }),
  },

  push: {
    vapidPublicKey: () => request('/push/vapid-public-key'),
    subscribe: (subscription) =>
      request('/push/subscribe', { method: 'POST', body: subscription }),
    unsubscribe: (endpoint) =>
      request('/push/unsubscribe', { method: 'POST', body: { endpoint } }),
  },

  users: {
    get: (id) => request(`/users/${id}`),
    reviews: (id) => request(`/users/${id}/reviews`),
  },

  subscriptions: {
    initializePayment: (body) => request('/subscriptions/initialize-payment', { method: 'POST', body }),
    verifyPayment: (reference) => request('/subscriptions/verify-payment', { method: 'POST', body: { reference } }),
    cancel: () => request('/subscriptions/cancel', { method: 'POST' }),
    status: () => request('/subscriptions/status'),
  },

  analytics: {
    overview: (params = {}) => {
      const qs = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') qs.set(k, v);
      });
      const str = qs.toString();
      return request(`/analytics/overview${str ? `?${str}` : ''}`);
    },
    items: (params = {}) => {
      const qs = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') qs.set(k, v);
      });
      const str = qs.toString();
      return request(`/analytics/items${str ? `?${str}` : ''}`);
    },
    advertisements: (params = {}) => {
      const qs = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') qs.set(k, v);
      });
      const str = qs.toString();
      return request(`/analytics/advertisements${str ? `?${str}` : ''}`);
    },
    trends: (params = {}) => {
      const qs = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') qs.set(k, v);
      });
      const str = qs.toString();
      return request(`/analytics/trends${str ? `?${str}` : ''}`);
    },
  },

  subscriptionSettings: {
    getPublicPlans: () => request('/subscription-settings/public'),
    getSettings: () => request('/subscription-settings'),
    updateSettings: (plan, body) => request(`/subscription-settings/${plan}`, { method: 'PATCH', body }),
  },

  referrals: {
    getProfile: () => request('/referrals/profile'),
    getReferrals: () => request('/referrals/list'),
    getShareData: () => request('/referrals/share-data'),
    trackVisit: (code) => request(`/referrals/visit/${code}`),
  },
};

export default api;
