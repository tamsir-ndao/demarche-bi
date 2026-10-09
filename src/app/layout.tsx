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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
