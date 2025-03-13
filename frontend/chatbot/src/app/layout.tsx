import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";
import { AuthProvider } from "@/context/AuthContext";
import { SidebarProvider } from "@/context/SidebarContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ChatBot",
  description: "Simple chatbot application",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="pt-16">
        <AuthProvider>
          <SidebarProvider>
            <Navigation />
            <main>{children}</main>
          </SidebarProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
