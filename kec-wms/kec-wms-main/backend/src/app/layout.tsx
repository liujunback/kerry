import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale,getMessages } from "next-intl/server";
import "./globals.css";

const themeColorInitScript = `
(() => {
  const storageKey = 'kec-wms-theme-color';
  const colors = {
    orange: '#ea580c',
    blue: '#2563eb',
    emerald: '#059669',
    violet: '#7c3aed',
    rose: '#e11d48',
  };
  const aliases = {
    cyan: 'violet',
  };
  try {
    const color = localStorage.getItem(storageKey);
    const normalizedColor = color && aliases[color] ? aliases[color] : color;
    const themeColor = normalizedColor && colors[normalizedColor] ? normalizedColor : 'orange';
    const primary = colors[themeColor];
    document.documentElement.dataset.themeColor = themeColor;
    document.documentElement.style.setProperty('--primary', primary);
    document.documentElement.style.setProperty('--ring', primary);
    document.documentElement.style.setProperty('--sidebar-primary', primary);
    document.documentElement.style.setProperty('--sidebar-ring', primary);
  } catch {
    document.documentElement.dataset.themeColor = 'orange';
    document.documentElement.style.setProperty('--primary', colors.orange);
    document.documentElement.style.setProperty('--ring', colors.orange);
    document.documentElement.style.setProperty('--sidebar-primary', colors.orange);
    document.documentElement.style.setProperty('--sidebar-ring', colors.orange);
  }
})();
`;

export const metadata: Metadata = {
  title: "KEC WMS - 仓库管理系统",
  description: "多租户仓库管理系统",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeColorInitScript }} />
      </head>
      <body className="antialiased font-sans">
        <ThemeProvider>
          <NextIntlClientProvider messages={messages}>
            {children}
            <Toaster />
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
