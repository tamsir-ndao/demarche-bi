// Le message « Installe Démarche-Bi » : quand l'afficher, et se souvenir qu'il a été refusé.
// Que du calcul sur ce que le navigateur dit de lui (voir MessageInstaller, qui s'occupe du navigateur).

/** Après un « Plus tard », le message ne revient pas avant 14 jours. */
export const DUREE_SILENCE_MS = 14 * 24 * 60 * 60 * 1000;

/** Le message attend quelques secondes : jamais dès l'arrivée sur le site. */
export const DELAI_AVANT_MESSAGE_MS = 8_000;

export const CLE_REJET = "demarche-bi:installation-rejetee";

export type Navigateur = { userAgent: string; platform: string; maxTouchPoints: number };

/** Les navigateurs de l'iPhone autres que Safari et ceux intégrés aux applications : « Partager » n'y est pas au même endroit. */
const AUTRES_NAVIGATEURS_IOS = /CriOS|FxiOS|EdgiOS|OPiOS|OPT\/|GSA\/|FBAN|FBAV|Instagram|Line\/|MicroMessenger|Snapchat|Twitter|TikTok/;

/**
 * Safari sur iPhone ou iPad : le seul cas où l'on peut expliquer « Partager, puis Sur l'écran d'accueil ».
 * Un iPad se présente comme un Mac : seul son écran tactile le trahit.
 */
export function estSafariIos({ userAgent, platform, maxTouchPoints }: Navigateur): boolean {
  const appleMobile = /iPhone|iPad|iPod/.test(userAgent) || (platform === "MacIntel" && maxTouchPoints > 1);
  if (!appleMobile) return false;
  return /Version\//.test(userAgent) && /Safari\//.test(userAgent) && !AUTRES_NAVIGATEURS_IOS.test(userAgent);
}

export type Message = "aucun" | "android" | "ios";

type Situation = {
  /** L'application est déjà installée (ouverte en plein écran depuis l'icône). */
  installee: boolean;
  /** Un « Plus tard » date de moins de 14 jours. */
  rejeteRecemment: boolean;
  /** Le délai de quelques secondes est passé. */
  delaiEcoule: boolean;
  /** Le navigateur a préparé l'installation d'un appui (Chrome sur Android). */
  invitationPrete: boolean;
  safariIos: boolean;
};

/** Ce qu'il faut dire à la personne : un bouton « Installer » (Android), des explications (Safari de l'iPhone), ou rien. */
export function choisirMessage({ installee, rejeteRecemment, delaiEcoule, invitationPrete, safariIos }: Situation): Message {
  if (installee || rejeteRecemment || !delaiEcoule) return "aucun";
  if (invitationPrete) return "android";
  return safariIos ? "ios" : "aucun";
}

/** Vrai pendant 14 jours après un « Plus tard ». Une date dans le futur (horloge changée) est ignorée. */
export function rejeteRecemment(rejeteLe: number | undefined, maintenantMs: number): boolean {
  if (rejeteLe === undefined) return false;
  const ecoule = maintenantMs - rejeteLe;
  return ecoule >= 0 && ecoule < DUREE_SILENCE_MS;
}

export type Stockage = Pick<Storage, "getItem" | "setItem">;

/** Quand la personne a dit « Plus tard » (en millisecondes), ou rien. Ne plante jamais : le stockage est parfois bloqué (navigation privée). */
export function lireRejet(stockage: Stockage | undefined): number | undefined {
  try {
    const brut = stockage?.getItem(CLE_REJET);
    if (!brut) return undefined;
    const valeur = Number(brut);
    return Number.isFinite(valeur) && valeur >= 0 ? valeur : undefined;
  } catch {
    return undefined;
  }
}

export function ecrireRejet(stockage: Stockage | undefined, maintenantMs: number): void {
  try {
    stockage?.setItem(CLE_REJET, String(maintenantMs));
  } catch {
    // Stockage bloqué : le message reviendra à la prochaine visite, ce n'est pas grave.
  }
}
