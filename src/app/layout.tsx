import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jënd-Jaay",
  description:
    "Sourcing alimentaire par IA : décris ton besoin, compare les offres des fournisseurs.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
