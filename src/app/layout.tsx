import type { Metadata, Viewport } from "next";
import { EcranDemarrage } from "@/components/EcranDemarrage";
import { HorsConnexion } from "@/components/HorsConnexion";
import { MessageInstaller } from "@/components/MessageInstaller";
import { imagesDeDemarrage } from "@/lib/demarrage";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Démarche-Bi", template: "%s · Démarche-Bi" },
  description:
    "Pose ta question sur une démarche administrative au Sénégal. Réponses fondées uniquement sur des fiches vérifiées, avec leurs sources officielles.",
  // Une fois ajoutée à l'écran d'accueil de l'iPhone : le nom sous l'icône, l'ouverture en plein écran et, au lancement,
  // le logo sur le fond de l'application (une image par taille d'iPhone, claire et sombre) à la place d'un écran vide.
  appleWebApp: { capable: true, title: "Démarche-Bi", startupImage: imagesDeDemarrage() },
  // Safari de l'iPhone lit encore l'ancien nom de cette balise pour les images de démarrage.
  other: { "apple-mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4faf6" },
    { media: "(prefers-color-scheme: dark)", color: "#161718" },
  ],
  // Laisse la barre du bas passer au-dessus de la zone du geste sur les téléphones récents.
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr">
      <body className="flex min-h-dvh flex-col bg-page font-sans text-ink antialiased">
        <EcranDemarrage />
        <a
          href="#contenu"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-brand focus:px-5 focus:py-3 focus:font-bold focus:text-on-brand"
        >
          Aller au contenu
        </a>
        <HorsConnexion />
        {children}
        <MessageInstaller />
      </body>
    </html>
  );
}
