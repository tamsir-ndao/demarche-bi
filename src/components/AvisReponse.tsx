"use client";

import { useEffect, useRef, useState } from "react";
import { envoyerLAvis, messageDeLErreur } from "@/lib/avis/envoi";
import { LONGUEUR_MAX_COMMENTAIRE } from "@/lib/texte";
import { Carte } from "./Carte";
import { Icon } from "./Icon";
import { classesBouton } from "./LienBouton";

type Etape = "choix" | "commentaire" | "merci";

// Deux boutons côte à côte quand la place le permet, l'un sur l'autre sur les petits téléphones.
const RANGEE_DE_BOUTONS = "mt-3 grid gap-3 min-[26rem]:grid-cols-2";
const PENDANT_L_ENVOI = "disabled:opacity-60";

/**
 * « Cette réponse t'a aidé ? » : un appui sur « Oui » envoie l'avis ; « Pas vraiment » laisse dire, si on veut,
 * ce qui manque. `journalId` rattache l'avis à la réponse que la personne vient de lire (journal anonyme).
 */
export function AvisReponse({ journalId }: { journalId: string }) {
  const [etape, setEtape] = useState<Etape>("choix");
  const [commentaire, setCommentaire] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const champ = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (etape === "commentaire") champ.current?.focus();
  }, [etape]);

  async function envoyer(utile: boolean) {
    setEnvoi(true);
    setErreur(null);
    const mot = utile ? "" : commentaire.trim();
    const resultat = await envoyerLAvis({ journalId, utile, commentaire: mot === "" ? null : mot });
    setEnvoi(false);
    if (resultat.ok) setEtape("merci");
    else setErreur(messageDeLErreur(resultat.code));
  }

  function changerEtape(suivante: Etape) {
    setErreur(null);
    setEtape(suivante);
  }

  return (
    <Carte fond="teinte" aria-labelledby="titre-avis" className="mt-4">
      {etape === "merci" ? (
        <p id="titre-avis" role="status" className="flex items-center gap-3 text-[17px] leading-6 font-bold">
          <Icon name="coche" size={24} strokeWidth={2.6} className="flex-none text-leaf" />
          Merci pour ton avis.
        </p>
      ) : (
        <>
          <h2 id="titre-avis" className="text-xl leading-7 font-bold">
            Cette réponse t’a aidé&nbsp;?
          </h2>

          {etape === "choix" ? (
            <div className={RANGEE_DE_BOUTONS}>
              <button
                type="button"
                disabled={envoi}
                onClick={() => void envoyer(true)}
                className={classesBouton("secondaire", "moyen", PENDANT_L_ENVOI)}
              >
                <Icon name="coche" size={20} strokeWidth={2.6} />
                Oui
              </button>
              <button
                type="button"
                disabled={envoi}
                onClick={() => changerEtape("commentaire")}
                className={classesBouton("secondaire", "moyen", PENDANT_L_ENVOI)}
              >
                Pas vraiment
              </button>
            </div>
          ) : (
            <form
              className="mt-3"
              onSubmit={(evenement) => {
                evenement.preventDefault();
                if (!envoi) void envoyer(false);
              }}
            >
              <label htmlFor="commentaire-avis" className="block text-[15px] leading-5 font-bold text-ink-2">
                Dis-moi ce qui manque (facultatif)
              </label>
              <textarea
                id="commentaire-avis"
                ref={champ}
                rows={3}
                maxLength={LONGUEUR_MAX_COMMENTAIRE}
                value={commentaire}
                onChange={(evenement) => setCommentaire(evenement.target.value)}
                className="mt-2 block w-full resize-none rounded-[20px] border-[1.5px] border-edge bg-card px-4 py-3 text-[17px] leading-6 text-ink focus:border-leaf focus:shadow-[0_0_0_4px_var(--glow)] focus:outline-none"
              />
              <div className={RANGEE_DE_BOUTONS}>
                <button type="submit" disabled={envoi} className={classesBouton("principal", "moyen", PENDANT_L_ENVOI)}>
                  {envoi ? "J’envoie…" : "Envoyer"}
                </button>
                <button
                  type="button"
                  disabled={envoi}
                  onClick={() => changerEtape("choix")}
                  className={classesBouton("secondaire", "moyen", PENDANT_L_ENVOI)}
                >
                  Retour
                </button>
              </div>
            </form>
          )}

          {/* Toujours présent : le lecteur d'écran annonce le message quand il apparaît. */}
          <p role="status" className={erreur ? "mt-3 flex items-start gap-2 text-[15px] leading-5 text-ink-2" : "sr-only"}>
            {erreur ? (
              <>
                <Icon name="info" size={20} strokeWidth={2} className="flex-none text-leaf" />
                {erreur}
              </>
            ) : null}
          </p>
        </>
      )}
    </Carte>
  );
}
