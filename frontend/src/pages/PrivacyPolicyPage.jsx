import React from 'react';
import { Link } from 'react-router-dom';

const SECTIONS = [
  {
    title: '1. Information we collect',
    body: 'We collect information you provide directly, such as your name, email address, phone number, WhatsApp number, location and profile picture. When you list an item, we also collect the item details and photos you submit. We automatically collect technical information such as your IP address, device and browser details when you use the Platform.',
  },
  {
    title: '2. How we use your information',
    body: 'We use your information to operate and improve the Platform, to let buyers contact sellers, to send you notifications about your listings and messages, to personalise your experience, and to detect and prevent fraud or abuse.',
  },
  {
    title: '3. Sharing your information',
    body: 'We share your contact details with other users only in the context of a listing or transaction (for example, a buyer viewing the phone number or WhatsApp number on your listing). We do not sell your personal information to third parties.',
  },
  {
    title: '4. Communications',
    body: 'We may send you email, in-app and push notifications related to your account, such as reset codes, item reactions, messages and updates. You can manage these preferences in your notification settings at any time.',
  },
  {
    title: '5. Payment information',
    body: 'Payments are processed by our payment providers. We do not store your card details on our servers. Please review the privacy policy of the payment provider for details on how they handle your payment data.',
  },
  {
    title: '6. Cookies and local storage',
    body: 'We use cookies and browser local storage to keep you signed in, remember your preferences and measure usage. You can disable cookies in your browser settings, but some features of the Platform may not work correctly without them.',
  },
  {
    title: '7. Data security',
    body: 'We take reasonable technical and organisational measures to protect your information, including encrypting passwords and using secure connections. No method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.',
  },
  {
    title: '8. Data retention',
    body: 'We retain your account information while your account is active. You may close your account and request deletion of your data at any time, and we will remove it within a reasonable period, except where we are required to keep it by law.',
  },
  {
    title: '9. Third-party services',
    body: 'Our Platform may link to third-party services such as WhatsApp, phone and email providers. These services have their own privacy policies, and we are not responsible for how they handle your information.',
  },
  {
    title: "10. Children's privacy",
    body: 'The Platform is not intended for children under 18, and we do not knowingly collect personal information from children.',
  },
  {
    title: '11. Your rights',
    body: 'Depending on your location, you may have the right to access, correct, or delete your personal information, and to object to or restrict certain processing. To exercise these rights, please contact us through the Contact page.',
  },
  {
    title: '12. Changes to this policy',
    body: 'We may update this Privacy Policy from time to time. The latest version will always be available on this page, and significant changes will be communicated to you where appropriate.',
  },
  {
    title: '13. Contact us',
    body: 'If you have questions about this Privacy Policy or how we handle your data, please contact us through the Contact page.',
  },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Privacy Policy</h1>
      <p className="mt-2 text-sm text-gray-500">Last updated: August 2026</p>

      <div className="mt-8 space-y-8">
        {SECTIONS.map((s) => (
          <section key={s.title}>
            <h2 className="text-lg font-bold text-gray-900">{s.title}</h2>
            <p className="mt-2 text-sm text-gray-600 leading-relaxed">{s.body}</p>
          </section>
        ))}
      </div>

      <div className="mt-10 bg-gray-50 rounded-2xl p-6 sm:p-8">
        <p className="text-sm text-gray-600 leading-relaxed">
          Questions about privacy?{' '}
          <Link to="/contact" className="font-semibold text-indigo-600 hover:text-indigo-800">
            Contact our support team
          </Link>{' '}
          and we'll be happy to help.
        </p>
      </div>
    </div>
  );
}
