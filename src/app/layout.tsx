import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Blog",
    template: "%s | Blog",
  },
  description: "A static blog managed by a local AI agent.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <base target="_blank" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inclusive+Sans:ital,wght@0,300..700;1,300..700&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.13.1/font/bootstrap-icons.min.css"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
