import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import { ToastProvider } from "@/lib/toast-context";
import { AppShell } from "@/components/AppShell";
import { ToastHost } from "@/components/ToastHost";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
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
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full overflow-hidden">
        <AuthProvider>
          <ToastProvider>
            <AppShell>{children}</AppShell>
            <ToastHost />
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
