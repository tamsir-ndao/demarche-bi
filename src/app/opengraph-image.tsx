import { ImageResponse } from "next/og";

// L'aperçu du lien quand on partage le site (WhatsApp, Facebook, X…) : le logo de l'écran de démarrage, le nom et
// une phrase. Couleurs de globals.css : vert foncé (--gd) en fond, logo vert (--g) avec la coche encre (--on-g).
// Pas de police téléchargée : la police fournie avec next/og suffit, rien ne part sur le réseau à la construction.
// Générée une fois à la construction (aucune donnée de requête), servie comme une image fixe.

export const alt = "Démarche-Bi : tes démarches au Sénégal, avec les sources officielles.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const VERT_FONCE = "#0e7c46";
const VERT = "#22d183";
const ENCRE = "#0f2a1e";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 36,
          background: VERT_FONCE,
          color: "#ffffff",
          padding: 80,
          textAlign: "center",
        }}
      >
        {/* Le logo : carré vert aux coins ronds, coche foncée (même dessin que EcranDemarrage). */}
        <div
          style={{
            width: 168,
            height: 168,
            borderRadius: 54,
            background: VERT,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            width="100"
            height="100"
            viewBox="0 0 24 24"
            fill="none"
            stroke={ENCRE}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m5 12.5 4.5 4.5L19 7.5" />
          </svg>
        </div>
        {/* Une seule graisse est disponible sans police téléchargée : la taille fait le titre. */}
        <div style={{ fontSize: 96, letterSpacing: -2 }}>Démarche-Bi</div>
        <div style={{ fontSize: 40, opacity: 0.92 }}>Tes démarches au Sénégal, avec les sources officielles.</div>
      </div>
    ),
    size,
  );
}
