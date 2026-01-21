import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Sidebar } from '@/components/Sidebar';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'Antigravity OS | Sovereign Nexus',
  description: 'The Autonomous Spec-to-Production Engine',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${mono.variable} h-full bg-black`}>
      <body className="bg-black text-white antialiased overflow-hidden flex h-screen font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
        {/* Ambient Background Effects */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-cyan-900/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-violet-900/10 rounded-full blur-[120px]" />
        </div>

        {/* Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <main className="flex-1 relative z-10 overflow-hidden flex flex-col">
          {/* Top Bar / Breadcrumb area could go here */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">{children}</div>
        </main>
      </body>
    </html>
  );
}
