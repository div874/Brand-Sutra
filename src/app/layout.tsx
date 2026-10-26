import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { AppProvider } from '@/lib/store';
import { Header } from '@/components/Header';
import { ParticlesBackground } from '@/components/ParticlesBackground';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Brand Sutra — Consistent brands. Confident content.',
  description: 'Consistent brands. Confident content. Pre-check marketing copy against official guidelines and verified facts.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} dark`} style={{ backgroundColor: '#0a0a0a', colorScheme: 'dark' }}>
      <body
        className="min-h-screen bg-[#0a0a0a] text-[#ededed] font-sans antialiased flex flex-col"
        style={{ backgroundColor: '#0a0a0a', color: '#ededed' }}
      >
        <ParticlesBackground />
        <AppProvider>
          <div className="relative z-10 flex flex-col flex-1">
            <Header />
            <main className="flex-1 max-w-[1440px] xl:max-w-[1536px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
              {children}
            </main>
          </div>
        </AppProvider>
      </body>
    </html>
  );
}
