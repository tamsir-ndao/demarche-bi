// L'écran de démarrage des téléphones : le logo apparaît, puis l'application s'ouvre en fondu (voir EcranDemarrage).
// Ici : quand l'allumer (une seule fois par ouverture) et les images de démarrage de l'iPhone.

export const ID_ECRAN_DEMARRAGE = "ecran-demarrage";

/** Note laissée dans la mémoire de l'onglet : l'écran a déjà été montré, il ne revient ni au rechargement ni sur une autre page. */
export const CLE_DEMARRAGE = "demarche-bi:demarrage";

/**
 * Le script qui allume l'écran de démarrage, joué par le navigateur pendant la lecture de la page, avant le premier
 * affichage (l'écran est caché tant qu'il n'est pas allumé, donc la page ne clignote pas). Il ne dépend que de
 * `document` et `sessionStorage`. Quand la mémoire de l'onglet est bloquée, on ne peut pas savoir : on montre l'écran.
 */
export const SCRIPT_DEMARRAGE = `(function(){try{var e=document.getElementById("${ID_ECRAN_DEMARRAGE}");if(!e)return;var vu=false;try{vu=!!sessionStorage.getItem("${CLE_DEMARRAGE}");sessionStorage.setItem("${CLE_DEMARRAGE}","1")}catch(_){}if(!vu)e.setAttribute("data-actif","oui")}catch(_){}})()`;

/** Les tailles d'écran des iPhone (en points, avec leur ratio de pixels) : Safari veut une image à la taille exacte. */
export const APPAREILS_IOS = [
  { largeur: 440, hauteur: 956, ratio: 3 }, // 16 Pro Max, 17 Pro Max
  { largeur: 420, hauteur: 912, ratio: 3 }, // Air
  { largeur: 402, hauteur: 874, ratio: 3 }, // 16 Pro, 17, 17 Pro
  { largeur: 430, hauteur: 932, ratio: 3 }, // 14 Pro Max, 15 Plus, 15 Pro Max, 16 Plus
  { largeur: 393, hauteur: 852, ratio: 3 }, // 14 Pro, 15, 15 Pro, 16
  { largeur: 428, hauteur: 926, ratio: 3 }, // 12 Pro Max, 13 Pro Max, 14 Plus
  { largeur: 390, hauteur: 844, ratio: 3 }, // 12, 12 Pro, 13, 13 Pro, 14, 16e
  { largeur: 375, hauteur: 812, ratio: 3 }, // X, XS, 11 Pro, 12 mini, 13 mini
  { largeur: 414, hauteur: 896, ratio: 3 }, // XS Max, 11 Pro Max
  { largeur: 414, hauteur: 896, ratio: 2 }, // XR, 11
  { largeur: 414, hauteur: 736, ratio: 3 }, // 6s Plus, 7 Plus, 8 Plus
  { largeur: 375, hauteur: 667, ratio: 2 }, // 6s, 7, 8, SE (2e et 3e génération)
  { largeur: 320, hauteur: 568, ratio: 2 }, // 5s, SE (1re génération)
] as const;

export type ImageDeDemarrage = { url: string; media: string };

/** Une image claire et une image sombre par iPhone, avec la requête d'écran qui désigne cet iPhone et ce mode. */
export function imagesDeDemarrage(): ImageDeDemarrage[] {
  return APPAREILS_IOS.flatMap(({ largeur, hauteur, ratio }) =>
    (["clair", "sombre"] as const).map((mode) => ({
      url: `/demarrage/iphone-${largeur * ratio}x${hauteur * ratio}-${mode}.png`,
      media: `(device-width: ${largeur}px) and (device-height: ${hauteur}px) and (-webkit-device-pixel-ratio: ${ratio}) and (orientation: portrait) and (prefers-color-scheme: ${mode === "clair" ? "light" : "dark"})`,
    })),
  );
}
