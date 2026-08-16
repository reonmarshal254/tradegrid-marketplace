'use strict';
const app = require('../src/app');
const { pool } = require('../src/config/db');

const base = (port) => `http://localhost:${port}/api`;
let token = '';

async function call(port, path, { method = 'GET', body, isForm } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!isForm && body) headers['Content-Type'] = 'application/json';
  const res = await fetch(base(port) + path, {
    method,
    headers,
    body: isForm ? body : body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${JSON.stringify(data)}`);
  return data;
}

async function run() {
  const server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  const port = server.address().port;

  const email = `test_${Date.now()}@example.com`;
  const password = 'Passw0rd123!';

  const reg = await call(port, '/auth/register', {
    method: 'POST',
    body: { name: 'Test User', email, password, phone: '+123456789', whatsapp: '2348012345678', location: 'Lagos' },
  });
  token = reg.token;
  console.log('register: OK');

  const me = await call(port, '/auth/me');
  console.log('me: OK ->', me.user.email);

  const login = await call(port, '/auth/login', { method: 'POST', body: { email, password } });
  token = login.token;
  console.log('login: OK');

  const item = await call(port, '/items', {
    method: 'POST',
    isForm: true,
    body: (() => {
      const fd = new FormData();
      fd.append('name', 'Smoke Test Item');
      fd.append('description', 'A test item created by the smoke test.');
      fd.append('price', '1234.56');
      fd.append('category', 'Electronics');
      fd.append('age', '2 years');
      fd.append('has_receipt', 'true');
      return fd;
    })(),
  });
  const itemId = item.item.id;
  console.log('create item: OK ->', itemId);

  const categories = await call(port, '/items/categories');
  console.log('categories: OK ->', categories.categories.length);

  const buyerEmail = `buyer_${Date.now()}@example.com`;
  const buyer = await call(port, '/auth/register', {
    method: 'POST',
    body: { name: 'Buyer User', email: buyerEmail, password, phone: '+223456789', whatsapp: '234812345678', location: 'Abuja' },
  });
  token = buyer.token;
  console.log('buyer register: OK');

  await call(port, `/items/${itemId}/view`, { method: 'POST' });
  console.log('record view: OK');

  await call(port, `/items/${itemId}/react`, { method: 'POST' });
  const fav = await call(port, '/items/favorites');
  console.log('favorites: OK ->', fav.items.length);

  const recent = await call(port, '/items/recently-viewed');
  console.log('recently viewed: OK ->', recent.items.length);

  const purchased = await call(port, `/items/${itemId}/purchased`, { method: 'POST' });
  console.log('mark purchased: OK -> purchased=', purchased.item.purchased);

  const review = await call(port, `/items/${itemId}/review`, {
    method: 'POST',
    body: { rating: 5, comment: 'Great item, smooth transaction!' },
  });
  console.log('add review: OK -> my_review=', review.item.my_review.rating);

  await call(port, '/account/report', {
    method: 'POST',
    body: { reported_user_id: reg.user.id, category: 'scam', reason: 'This user asked me to pay in advance.' },
  });
  console.log('report user: OK');

  await call(port, '/account/support', {
    method: 'POST',
    body: { subject: 'Question about payment', message: 'How do I safely pay for an item?' },
  });
  console.log('support ticket: OK');

  const conv = await call(port, '/messages/conversations', {
    method: 'POST',
    body: { item_id: itemId, user_id: reg.user.id },
  });
  const convId = conv.conversation.id;
  const msg = await call(port, `/messages/conversations/${convId}/messages`, {
    method: 'POST',
    body: { body: 'Hi, is this still available?' },
  });
  console.log('send message: OK ->', msg.message.sent_by_me);

  token = reg.token;
  const convView = await call(port, `/messages/conversations/${convId}`);
  console.log('seller reads conversation: OK -> messages=', convView.messages.length);
  await call(port, `/messages/conversations/${convId}/messages`, {
    method: 'POST',
    body: { body: 'Yes it is, price is negotiable.' },
  });
  console.log('seller reply: OK');

  token = buyer.token;
  const convList = await call(port, '/messages/conversations');
  console.log('buyer conversations: OK ->', convList.conversations.length);
  const unreadMsgs = await call(port, '/messages/unread-count');
  console.log('message unread: OK ->', unreadMsgs.unread_count);

  await call(port, '/account/search-history', { method: 'POST', body: { query: 'smoke laptop' } });
  const history = await call(port, '/account/search-history');
  console.log('search history: OK ->', history.history.length);

  const settings = await call(port, '/account/settings');
  console.log('settings: OK ->', typeof settings.settings);

  await call(port, '/account/feedback', {
    method: 'POST',
    body: { subject: 'Smoke test feedback', message: 'Everything works great!' },
  });
  console.log('feedback: OK');

  const activity = await call(port, '/account/activity');
  console.log('activity log: OK ->', activity.activities.length);

  token = reg.token;
  const detailAfter = await call(port, `/items/${itemId}`);
  console.log(
    'item detail rating: OK ->',
    detailAfter.item.seller.rating_avg,
    'avg /',
    detailAfter.item.seller.rating_count,
    'count | my_review=',
    detailAfter.item.my_review,
    '| purchased=',
    detailAfter.item.purchased,
  );

  const reviews = await call(port, `/users/${reg.user.id}/reviews`);
  console.log('seller reviews: OK ->', reviews.reviews.length, '| rating=', reviews.rating.avg);

  token = reg.token;
  await pool.query(`UPDATE users SET role = 'admin' WHERE id = $1`, [reg.user.id]);
  const stats = await call(port, '/admin/stats');
  console.log('admin stats: OK -> users=', stats.stats.total_users, '| items=', stats.stats.total_items, '| chart days=', stats.chart.length);

  const adminUsers = await call(port, '/admin/users');
  console.log('admin users: OK ->', adminUsers.users.length);

  const adminItems = await call(port, '/admin/items');
  console.log('admin items: OK ->', adminItems.items.length);

  const flagged = await call(port, `/admin/items/${itemId}`, { method: 'PATCH', body: { featured: true } });
  console.log('admin flag item: OK -> featured=', flagged.item.featured);

  const insights = await call(port, '/admin/insights');
  console.log('admin insights: OK -> anomalies=', insights.anomalies.length, '| scam reports=', insights.scam_reports.length);

  const adminReports = await call(port, '/admin/reports');
  console.log('admin reports: OK ->', adminReports.reports.length);
  await call(port, `/admin/reports/${adminReports.reports[0].id}`, { method: 'PATCH', body: { status: 'resolved' } });
  console.log('resolve report: OK');

  const support = await call(port, '/admin/support');
  await call(port, `/admin/support/${support.tickets[0].id}/reply`, {
    method: 'POST',
    body: { reply: 'Please pay in person only.' },
  });
  console.log('admin support reply: OK');

  await call(port, '/admin/activity');
  console.log('admin activity: OK');

  await pool.query(`UPDATE users SET role = 'user' WHERE id = $1`, [reg.user.id]);

  const list = await call(port, '/items?search=Smoke&sort=price_desc&category=Electronics');
  console.log('list items: OK ->', list.pagination.total, 'total');

  const detail = await call(port, `/items/${itemId}`);
  console.log('item detail: OK -> seller=', detail.item.seller.name, '| wa=', detail.item.seller.whatsapp);

  const sold = await call(port, `/items/${itemId}/sold`, { method: 'POST' });
  console.log('mark sold: OK');

  const my = await call(port, '/items/my?status=sold');
  console.log('my items: OK ->', my.items.length);

  const del = await call(port, `/items/${itemId}`, { method: 'DELETE' });
  console.log('delete item: OK');

  const n = await call(port, '/notifications/unread-count');
  console.log('notifications: OK -> unread=', n.unread_count);

  const push = await call(port, '/push/vapid-public-key');
  console.log('push status: OK -> configured=', push.configured);

  server.close(() => pool.end().then(() => process.exit(0)));
}

run().catch((err) => {
  console.error('SMOKE TEST FAILED:', err.message);
  pool.end().then(() => process.exit(1));
});
