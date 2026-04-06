import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";
import SessionProvider from "@/components/SessionProvider";
import Navbar from "@/components/Navbar";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Reklamacija na Život",
  description:
    "Anonimno se požali nekom strancu. Bez imena, bez osude, bez tragova.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="sr"
      className={`${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SessionProvider>
          <Navbar />
          <main className="flex-1 flex flex-col">{children}</main>
        </SessionProvider>
      </body>
    </html>
  );
}
