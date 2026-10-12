import { ID_ECRAN_DEMARRAGE, SCRIPT_DEMARRAGE } from "@/lib/demarrage";

/**
 * L'ouverture de l'application sur téléphone : le logo apparaît, la coche se dessine, puis l'écran s'efface en fondu
 * sur l'accueil (comme une application qu'on ouvre). Tout est en CSS (voir globals.css) : il s'affiche dès le premier
 * dessin de la page, sans attendre le JavaScript. Un petit script ne fait qu'allumer l'écran une seule fois par
 * ouverture (lib/demarrage). Caché sur ordinateur, quand le téléphone coupe les animations, et jamais cliquable.
 */
export function EcranDemarrage() {
  return (
    <>
      {/* Le script ajoute `data-actif` avant que React prenne la main : suppressHydrationWarning garde cet attribut. */}
      <div id={ID_ECRAN_DEMARRAGE} aria-hidden="true" suppressHydrationWarning className="ecran-demarrage">
        <span className="logo-demarrage">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 12.5 4.5 4.5L19 7.5" pathLength="1" className="coche-demarrage" />
          </svg>
        </span>
      </div>
      <script dangerouslySetInnerHTML={{ __html: SCRIPT_DEMARRAGE }} />
    </>
  );
}
