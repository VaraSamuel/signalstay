import type { Metadata } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "SignalStay",
  description: "AI-powered property intelligence for smarter travel reviews"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="relative">{children}</div>
      </body>
    </html>
  );
}