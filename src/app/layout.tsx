import type { Metadata } from 'next';
import { Hind, Rozha_One } from 'next/font/google';
import './globals.css';

const body = Hind({ subsets: ['latin', 'devanagari'], weight: ['400', '600'], variable: '--font-body' });
const head = Rozha_One({ subsets: ['latin'], weight: '400', variable: '--font-head' });

export const metadata: Metadata = {
  title: 'MangalPravesh',
  description: 'Plan, check, build and pay for your home, from plot to Pravesh.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${body.variable} ${head.variable}`}>{children}</body>
    </html>
  );
}
