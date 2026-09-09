import type { Metadata } from 'next';

import { LegalPage, type LegalSection } from '@/components/landing/legal-page';

export const metadata: Metadata = {
  title: 'Terms of Service — Scorra',
  description: 'The terms governing your use of the Scorra evaluation platform.',
};

const SECTIONS: LegalSection[] = [
  {
    title: '1. Acceptance of terms',
    body: [
      'By accessing or using Scorra ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, you may not use the Service. These terms apply to all visitors, users, and others who access the Service, including organization owners, administrators, and evaluators.',
    ],
  },
  {
    title: '2. Description of the service',
    body: [
      'Scorra is a quality evaluation platform for AI applications. It enables teams to upload datasets, create evaluation tasks, and collect structured human or AI-assisted judgments — including single scoring, pairwise comparison, and ranking workflows.',
      'The Service may be modified, updated, or discontinued — in whole or in part — at any time. We will endeavor to provide reasonable notice of material changes.',
    ],
  },
  {
    title: '3. Your account and organization',
    body: [
      'You are responsible for safeguarding the credentials used to access the Service and for all activity that occurs under your account. Organizations are responsible for the actions of their members, including invited evaluators.',
      'You must provide accurate and complete information when creating an account and keep it up to date. You must be at least 16 years old to use the Service.',
    ],
  },
  {
    title: '4. Acceptable use',
    body: [
      'You agree not to: (a) use the Service for any unlawful purpose; (b) upload datasets or content you do not have the rights to process; (c) attempt to gain unauthorized access to the Service, other accounts, or related systems; (d) interfere with or disrupt the integrity or performance of the Service; or (e) reverse engineer, scrape, or resell the Service without our prior written consent.',
    ],
  },
  {
    title: '5. Your data and content',
    body: [
      'You retain ownership of the datasets, prompts, responses, and evaluation results you submit to the Service ("Your Content"). By using the Service, you grant us a limited license to store, process, and display Your Content solely as necessary to provide the Service to you and your organization.',
      'You are responsible for ensuring that Your Content complies with applicable laws, including data protection and confidentiality obligations to third parties.',
    ],
  },
  {
    title: '6. Subscriptions and billing',
    body: [
      'Certain features of the Service require a paid subscription. Fees, plan limits, and billing periods are described at the point of purchase. Subscriptions renew automatically unless cancelled before the renewal date. Fees are non-refundable except as required by law.',
    ],
  },
  {
    title: '7. Disclaimers and limitation of liability',
    body: [
      'The Service is provided "as is" and "as available" without warranties of any kind, whether express or implied. We do not warrant that the Service will be uninterrupted, error-free, or that evaluation results will be fit for any particular purpose.',
      'To the maximum extent permitted by law, Scorra shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of data, profits, or revenue arising from your use of the Service.',
    ],
  },
  {
    title: '8. Termination',
    body: [
      'We may suspend or terminate your access to the Service at any time for conduct that we determine, in our sole discretion, violates these terms or is harmful to other users or to us. Upon termination, your right to use the Service ceases immediately.',
    ],
  },
  {
    title: '9. Changes to these terms',
    body: [
      'We may revise these terms from time to time. The most current version will always be posted on this page. By continuing to use the Service after changes take effect, you agree to the revised terms.',
    ],
  },
  {
    title: '10. Contact',
    body: ['Questions about these Terms of Service can be sent to legal@scorra.dev.'],
  },
];

export default function TermsPage() {
  return <LegalPage title="Terms of Service" updated="September 5, 2026" sections={SECTIONS} />;
}
