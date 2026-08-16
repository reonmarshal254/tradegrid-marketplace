import React from 'react';
import { Link } from 'react-router-dom';

const SECTIONS = [
  {
    title: '1. Acceptance of terms',
    body: 'By creating an account or using TRADEGRID ("the Platform"), you agree to be bound by these Terms and Conditions. If you do not agree, please do not use the Platform.',
  },
  {
    title: '2. Eligibility',
    body: 'You must be at least 18 years old to create an account or sell items. By registering, you confirm that the information you provide is accurate and complete. Each user is limited to one account.',
  },
  {
    title: '3. Account responsibility',
    body: 'You are responsible for safeguarding your account credentials and for all activity that occurs under your account. Notify us immediately if you suspect unauthorised access.',
  },
  {
    title: '4. Listing items',
    body: 'When posting an item you confirm that: (a) you own the item or have the right to sell it; (b) the item is legally allowed to be sold; (c) your description, photos and price are honest and accurate; and (d) you will not list counterfeit, stolen or prohibited goods.',
  },
  {
    title: '5. Prohibited conduct',
    body: "You agree not to use the Platform to harass others, post misleading or fraudulent listings, share others' personal information without consent, engage in price manipulation, or attempt to interfere with the Platform's security or operation.",
  },
  {
    title: '6. Transactions',
    body: 'TRADEGRID is a marketplace that connects buyers and sellers. We are not a party to the transaction between you and another user. All purchases and sales are made directly between users, and you are responsible for the terms of each transaction you enter into.',
  },
  {
    title: '7. Fees',
    body: 'Creating an account and posting items is free. Some optional features, such as premium subscriptions and advertisements, may be subject to fees which will be clearly shown before you complete any payment.',
  },
  {
    title: '8. Content and ads',
    body: 'You grant us a limited licence to display the content you post (including photos) so we can operate the Platform. Advertisements placed by businesses are not offers for sale by TRADEGRID, and we do not endorse any advertised product or service.',
  },
  {
    title: '9. Termination',
    body: 'We may suspend or terminate your account if you breach these Terms, and we reserve the right to remove listings that violate our policies. You may close your account at any time.',
  },
  {
    title: '10. Disclaimer of warranties',
    body: 'The Platform is provided "as is" and "as available". We do not warrant that listings are accurate or that items will meet your expectations. Items are sold by the seller, not by us.',
  },
  {
    title: '11. Limitation of liability',
    body: 'To the maximum extent permitted by law, TRADEGRID shall not be liable for any indirect, incidental or consequential damages arising from your use of the Platform or any transaction between users.',
  },
  {
    title: '12. Changes to these terms',
    body: 'We may update these Terms from time to time. The latest version will always be available on this page, and continued use of the Platform after changes take effect means you accept the updated Terms.',
  },
  {
    title: '13. Contact',
    body: 'If you have questions about these Terms, please contact us through the Contact page.',
  },
];

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Terms and Conditions</h1>
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
          Have a question about these terms?{' '}
          <Link to="/contact" className="font-semibold text-indigo-600 hover:text-indigo-800">
            Contact our support team
          </Link>{' '}
          and we'll be happy to help.
        </p>
      </div>
    </div>
  );
}
