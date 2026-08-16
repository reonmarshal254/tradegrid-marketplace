'use strict';
const webpush = require('web-push');

const vapidKeys = webpush.generateVAPIDKeys();

console.log('\nCopy these into your backend/.env file:\n');
console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log('\n');
