import type { Metadata } from "next";
import { Nunito_Sans, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import { AppShell } from "@/components/AppShell";
import { AppToaster } from "@/components/AppToaster";
import "./globals.css";

const bodyFont = Nunito_Sans({
  variable: "--font-body",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Commando",
  description: "Sales performance intervention platform",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${bodyFont.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full overflow-hidden">
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
        <AppToaster />
      </body>
    </html>
  );
}
