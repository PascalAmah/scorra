import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Scorra — AI Quality Platform',
  description: 'Evaluate, test, and monitor LLM-powered products.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-zinc-950 text-white antialiased">{children}</body>
    </html>
  );
}
