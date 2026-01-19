import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Antigravity OS',
  description: 'The Autonomous Spec-to-Production Engine',
};

export default function RootLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
