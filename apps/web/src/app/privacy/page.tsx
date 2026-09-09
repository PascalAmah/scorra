import type { Metadata } from 'next';

import { LegalPage } from '@/components/landing/legal-page';

export const metadata: Metadata = {
  title: 'Privacy Policy — Scorra',
  description: 'How Scorra collects, uses, and protects your data and evaluation content.',
};

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: 'Overview',
    body: [
      'This Privacy Policy explains how Scorra ("we", "us") collects, uses, and protects information when you use our evaluation platform. It applies to organization owners, administrators, evaluators, and website visitors.',
    ],
  },
  {
    title: 'Information we collect',
    body: [
      'Account information: your name, email address, password (stored only as a cryptographic hash), and organization details you provide when registering or accepting an invitation.',
      'Usage information: log data, device and browser type, pages visited, and actions performed within the Service, used to operate and improve the product.',
      'Evaluation content: the datasets, prompts, model responses, and evaluation results (scores, comparisons, rankings, flags, comments) that you and your organization submit to the Service.',
    ],
  },
  {
    title: 'How we use information',
    body: [
      'We use the information we collect to: provide and maintain the Service; manage your organization, members, and permissions; process evaluation tasks; communicate service updates and (with your consent) product news; and ensure the security and integrity of the platform.',
      'We do not sell your personal information, and we do not use your evaluation content to train models without your explicit, opt-in consent.',
    ],
  },
  {
    title: 'Data sharing',
    body: [
      'We share information only with: (a) members of your organization, according to the roles and permissions your administrators set; (b) service providers who help us operate the Service (such as hosting and email delivery), bound by confidentiality obligations; and (c) authorities, where required by law.',
    ],
  },
  {
    title: 'Data retention and deletion',
    body: [
      'We retain your information for as long as your account is active or as needed to provide the Service. When an organization deletes a dataset, task, or evaluation, the associated content is removed from our production systems. You may request full account deletion by contacting privacy@scorra.dev.',
    ],
  },
  {
    title: 'Security',
    body: [
      'We protect your data using industry-standard measures, including encryption in transit (TLS) and at rest, hashed credentials, role-based access controls, and audit logging of sensitive actions. No method of transmission or storage is completely secure, and we cannot guarantee absolute security.',
    ],
  },
  {
    title: 'Your rights',
    body: [
      'Depending on your jurisdiction, you may have the right to access, correct, export, or delete your personal information, and to object to or restrict certain processing. To exercise any of these rights, contact privacy@scorra.dev.',
    ],
  },
  {
    title: 'Cookies',
    body: [
      'We use a small number of essential cookies to keep you signed in and to remember your preferences. We do not use advertising or third-party tracking cookies.',
    ],
  },
  {
    title: 'Changes to this policy',
    body: [
      'We may update this Privacy Policy from time to time. The most current version will always be posted on this page, and material changes will be announced within the Service.',
    ],
  },
  {
    title: 'Contact',
    body: ['Questions about this Privacy Policy can be sent to privacy@scorra.dev.'],
  },
];

export default function PrivacyPage() {
  return <LegalPage title="Privacy Policy" updated="September 5, 2026" sections={SECTIONS} />;
}
