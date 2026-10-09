import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Démarche-Bi",
  description:
    "Pose ta question sur une démarche administrative au Sénégal. Réponses fondées uniquement sur des fiches vérifiées, avec leurs sources officielles.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className="h-full antialiased">
      <head>
        {/* Polices facultatives : si le réseau les bloque, les polices système prennent le relais. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Inter:wght@400;500;600;700;800&display=swap"
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
