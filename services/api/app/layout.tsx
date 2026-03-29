import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nelexis API",
  description: "Telemetry webhook and AI helpers for Nelexis",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui", padding: 24 }}>{children}</body>
    </html>
  );
}
