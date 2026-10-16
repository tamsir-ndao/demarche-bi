"use client"; // Une frontière d'erreur est forcément un composant client.

import { useEffect } from "react";

/**
 * Quand c'est la mise en page racine elle-même qui casse : cette page remplace tout le document, sans le layout,
 * sans globals.css ni Tailwind (le guide Next le dit). Elle rend donc son propre <html> et <body>, avec juste
 * assez de style pour rester lisible, suivre le thème du téléphone et garder le focus visible.
 */
export default function ErreurGlobale({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    // Seulement l'empreinte (ou le nom), jamais le message : il pourrait citer la question posée.
    console.error(error.digest ?? error.name);
  }, [error]);

  return (
    <html lang="fr">
      <body>
        <title>Quelque chose a cassé · Démarche-Bi</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* Les mêmes couleurs que globals.css, en clair et en sombre. */}
        <style>{`
          :root {
            color-scheme: light dark;
            --bg: #f4faf6; --card: #ffffff; --ink: #0f2a1e; --ink2: #3e5a4b; --edge: #4f9068;
            --g: #22d183; --gd: #0e7c46; --on-g: #0f2a1e;
            --sh: 0 1px 2px rgb(15 42 30 / 0.06), 0 10px 30px rgb(15 42 30 / 0.08);
          }
          @media (prefers-color-scheme: dark) {
            :root {
              --bg: #161718; --card: #1f2021; --ink: #ececec; --ink2: #b4b8bb; --edge: #767b80;
              --gd: #3ddc91; --on-g: #0a2016;
              --sh: 0 1px 2px rgb(0 0 0 / 0.35), 0 10px 30px rgb(0 0 0 / 0.35);
            }
          }
          body {
            margin: 0; min-height: 100dvh; background: var(--bg); color: var(--ink);
            font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; -webkit-font-smoothing: antialiased;
          }
          main { max-width: 720px; margin: 0 auto; padding: 16px; }
          section { background: var(--card); border-radius: 28px; padding: 24px 20px; box-shadow: var(--sh); }
          h1 { margin: 16px 0 0; font-size: 28px; line-height: 34px; letter-spacing: -0.01em; }
          p { margin: 8px 0 0; font-size: 17px; line-height: 26px; color: var(--ink2); }
          .bouton {
            display: flex; align-items: center; justify-content: center; box-sizing: border-box; width: 100%;
            min-height: 56px; margin-top: 20px; padding: 0 24px; border: 0; border-radius: 9999px;
            background: var(--g); color: var(--on-g); font: inherit; font-size: 17px; font-weight: 700; cursor: pointer;
          }
          .bouton:active { transform: scale(0.98); }
          :focus-visible { outline: 3px solid var(--gd); outline-offset: 3px; }
        `}</style>
        <main>
          <section aria-labelledby="titre-erreur">
            <h1 id="titre-erreur">Quelque chose a cassé.</h1>
            <p>Ce n’est pas toi. Réessaie, ou reviens à l’accueil.</p>
          </section>
          <button type="button" onClick={() => retry()} className="bouton">
            Réessayer
          </button>
        </main>
      </body>
    </html>
  );
}
