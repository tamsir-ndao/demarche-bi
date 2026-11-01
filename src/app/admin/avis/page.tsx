import type { Metadata } from "next";
import { Icon } from "@/components/Icon";
import { lireAvis, pourcent } from "@/lib/admin/donnees";
import { lireAdmin } from "@/lib/admin/serveur";
import { ficheAffichable } from "@/lib/fiches/disponibles";
import { Cadre, Carte, Indisponible, Vide } from "../Cadre";

export const metadata: Metadata = { title: "Avis", robots: { index: false, follow: false } };

const moment = (iso: string) => new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }).format(new Date(iso));

function Chiffre({ titre, valeur }: { titre: string; valeur: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-card p-4 lg:p-5">
      <p className="text-[13px] leading-[18px] font-semibold text-ink-2">{titre}</p>
      <p className="mt-1 text-[32px] leading-[38px] font-bold tracking-[-0.02em]">{valeur}</p>
    </div>
  );
}

async function Donnees() {
  const avis = await lireAdmin((requete) => lireAvis(requete));
  if (!avis) return <Indisponible />;
  const positifs = avis.filter(({ utile }) => utile).length;
  const avecCommentaire = avis.filter(({ commentaire }) => commentaire).length;
  return (
    <div className="flex flex-col gap-3 lg:gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <Chiffre titre="Avis" valeur={String(avis.length)} />
        <Chiffre titre="« Oui »" valeur={`${pourcent(positifs, avis.length)} %`} />
        <Chiffre titre="« Pas vraiment »" valeur={String(avis.length - positifs)} />
        <Chiffre titre="Avec commentaire" valeur={String(avecCommentaire)} />
      </div>
      <Carte titre="Les 100 derniers">
        {avis.length === 0 ? <Vide>Aucun avis pour l’instant.</Vide> : (
          <ul data-confidentiel className="divide-y divide-line">
            {avis.map(({ quand, utile, commentaire, question, demarche }, i) => (
              <li key={`${quand}-${i}`} className="flex gap-3 py-3">
                <span aria-hidden="true" className="flex size-8 flex-none items-center justify-center rounded-lg bg-tint text-leaf">
                  <Icon name={utile ? "coche" : "croix"} size={17} strokeWidth={2.6} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] leading-5 font-semibold">{utile ? "Oui, ça a aidé" : "Pas vraiment"}</p>
                  {commentaire && <p className="mt-0.5 text-[15px] leading-[22px] break-words">« {commentaire} »</p>}
                  {question && <p className="mt-1 text-[13px] leading-[18px] break-words text-ink-2">Question : {question}</p>}
                  <p className="mt-0.5 text-[12px] leading-4 break-words text-ink-2">
                    {moment(quand)}
                    {demarche ? ` · ${ficheAffichable(demarche)?.titre ?? demarche}` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Carte>
    </div>
  );
}

export default function Page() {
  return (
    <Cadre actif="avis" titre="Avis" sousTitre="Ce que les usagers disent des réponses. Confidentiel. Gardés 90 jours, heures en UTC.">
      <Donnees />
    </Cadre>
  );
}
