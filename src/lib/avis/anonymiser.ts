// Le masque du journal : avant d'écrire une question ou un commentaire dans la base, les e-mails, les téléphones et les
// numéros longs (carte d'identité, passeport, carte bancaire…) sont remplacés par une étiquette. Le journal sert à voir
// quelles questions les gens posent, pas qui les pose : un numéro tapé par erreur dans une question ne doit pas rester
// 90 jours dans la base. Les chiffres de la vie courante (« 10 000 FCFA », « 5 ans », « 2026 », « loi 72-61 ») restent.
// Ce masque ne reconnaît pas les noms ni les adresses écrits en toutes lettres.

const NUMERO = "[numéro]";
const TELEPHONE = "[téléphone]";
const EMAIL = "[e-mail]";

/** À partir de ce nombre de chiffres (espaces, points et tirets ignorés), une suite n'est plus un montant ni une date. */
const CHIFFRES_MIN_NUMERO = 8;

// Ce qu'on tape entre deux groupes de chiffres : espaces (dont l'insécable des montants), points, tirets.
const SEPARATEUR = String.raw`[\s.\-‐-―−]`;

const EMAIL_RE = /[\p{L}\p{N}._%+'-]+@[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)+/gu;

// Un passeport : une ou deux lettres suivies de 6 à 9 chiffres (« A01234567 », « AB 1234567 »). La lettre seule, ou la
// séparation par une espace, n'est admise qu'en majuscules : « de 2026000 » n'est pas un passeport.
const PASSEPORT_RE = /(?<![\p{L}\p{N}])(?:[A-Z]{1,2}[ -]?|[A-Za-z]{1,2})\p{Nd}{6,9}(?![\p{L}\p{N}])/gu;

// Une suite de chiffres, avec ou sans « + » devant, séparés par des espaces, des points ou des tirets.
const SUITE_DE_CHIFFRES_RE = new RegExp(String.raw`\+?\p{Nd}(?:${SEPARATEUR}*\p{Nd})*`, "gu");

/** Les chiffres d'une suite, en chiffres ASCII (« ７７ » pleine chasse donne « 77 »). */
function chiffresDe(suite: string): string {
  return Array.from(suite.normalize("NFKC"))
    .filter((c) => /\d/.test(c))
    .join("");
}

/** L'étiquette d'une suite de chiffres, ou `null` quand elle est assez courte pour être un montant, une année ou un délai. */
function etiquetteDeLaSuite(suite: string): string | null {
  const chiffres = chiffresDe(suite);
  const n = Array.from(suite).filter((c) => /\p{Nd}/u.test(c)).length;
  if (n < CHIFFRES_MIN_NUMERO) return null;

  const international = suite.startsWith("+") && n <= 15;
  const prefixeDe00 = /^00/.test(chiffres) && n >= 10 && n <= 17;
  const senegalNational = n === 9 && /^(?:7[05-8]|3[03])/.test(chiffres);
  const senegalAvecIndicatif = n === 12 && /^221(?:7[05-8]|3[03])/.test(chiffres);
  const dixChiffresEnZero = n === 10 && /^0[1-9]/.test(chiffres);
  return international || prefixeDe00 || senegalNational || senegalAvecIndicatif || dixChiffresEnZero ? TELEPHONE : NUMERO;
}

/**
 * Le texte sans e-mail, sans téléphone ni numéro long. Un passeport, une carte d'identité (13 chiffres), un téléphone
 * (`+221 77 123 45 67`, `00221…`, `77 123 45 67`, `77-123-45-67`) ou une carte bancaire deviennent « [numéro] » ou
 * « [téléphone] » ; une adresse e-mail devient « [e-mail] ». Aucune suite de 8 chiffres ou plus ne reste, espaces, points
 * et tirets ignorés : un montant de 10 millions de FCFA ou une date « 12-03-1990 » sont donc masqués aussi (faux positif
 * accepté). Rappeler le masque sur un texte déjà masqué ne change rien.
 */
export function masquerDonneesPersonnelles(texte: string): string {
  // Sans « @ », le motif d'e-mail ne peut rien trouver : on lui évite de parcourir un long texte pour rien.
  const sansEmail = texte.includes("@") ? texte.replace(EMAIL_RE, EMAIL) : texte;
  return sansEmail
    .replace(PASSEPORT_RE, NUMERO)
    .replace(SUITE_DE_CHIFFRES_RE, (suite) => etiquetteDeLaSuite(suite) ?? suite);
}

/** Vrai si le masque change quelque chose : le texte contient un e-mail, un téléphone ou un numéro long. */
export function contientDonneesPersonnelles(texte: string): boolean {
  return masquerDonneesPersonnelles(texte) !== texte;
}
