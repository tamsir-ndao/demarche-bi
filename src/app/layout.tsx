import type { Metadata, Viewport } from "next";
import { EcranDemarrage } from "@/components/EcranDemarrage";
import { HorsConnexion } from "@/components/HorsConnexion";
import { MessageInstaller } from "@/components/MessageInstaller";
import { SCRIPT_BIENVENUE } from "@/lib/bienvenue";
import { imagesDeDemarrage } from "@/lib/demarrage";
import { URL_SITE } from "@/lib/liens";
import "./globals.css";

export const metadata: Metadata = {
  // Base des adresses absolues des aperçus de lien (image OG, etc.).
  metadataBase: new URL(URL_SITE),
  title: { default: "Démarche-Bi", template: "%s · Démarche-Bi" },
  description:
    "Pose ta question sur une démarche administrative au Sénégal. Réponses fondées uniquement sur des fiches vérifiées, avec leurs sources officielles.",
  // Aperçu du lien partagé (WhatsApp, Facebook, X…). Pas de titre ni de description ici : chaque page garde
  // les siens (Next les reprend du titre et de la description de la page). L'image vient de opengraph-image.tsx.
  openGraph: { siteName: "Démarche-Bi", locale: "fr_SN", type: "website" },
  twitter: { card: "summary_large_image" },
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
    // suppressHydrationWarning : le script de la présentation pose `data-bienvenue` sur <html> avant React.
    <html lang="fr" suppressHydrationWarning>
      <body className="flex min-h-dvh flex-col bg-page font-sans text-ink antialiased">
        <EcranDemarrage />
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_BIENVENUE }} />
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
