import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "MyGestão — Finanças pessoais",
  description: "Controle de receitas, despesas parceladas e pagamentos por cartão.",
  icons: {
    icon: "/logo-new.png",
    apple: "/logo-new.png",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#0f4c81",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full">
      <body
        className={`${sans.variable} min-h-dvh min-h-full bg-slate-50 font-sans text-slate-900 antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
