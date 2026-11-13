import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://checker.sikarsa.id"),
  title: {
    default: "Checker Audit Excel · Sikarsa",
    template: "%s · Checker Sikarsa",
  },
  description:
    "Alat bantu dosen memeriksa bukti pengerjaan tugas Excel. File diproses di browser dan tidak diunggah.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
