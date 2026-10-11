import { Carte } from "@/components/Carte";
import { Icon } from "@/components/Icon";
import { LienBouton } from "@/components/LienBouton";
import { PageShell } from "@/components/PageShell";

export default function NotFound() {
  return (
    <PageShell retour={{ href: "/", libelle: "Retour à l’accueil" }}>
      <Carte aria-labelledby="titre-introuvable" className="mt-4 px-5 py-6">
        <span
          aria-hidden="true"
          className="flex size-16 items-center justify-center rounded-full border-2 border-dashed border-edge text-leaf"
        >
          <Icon name="aide" size={30} strokeWidth={2} />
        </span>
        <h1 id="titre-introuvable" className="mt-4 text-[28px] leading-[34px] font-bold tracking-[-0.01em]">
          Cette page n’existe pas
        </h1>
        <p className="mt-2 text-[17px] leading-[26px] text-ink-2">Le lien est peut-être faux. Tu peux chercher une démarche ou poser ta question.</p>
      </Carte>

      <LienBouton href="/demarches" icone="livre" className="mt-5">
        Voir les démarches
      </LienBouton>
      <LienBouton href="/" variante="secondaire" icone="bulle" className="mt-3">
        Poser une question
      </LienBouton>
      <div className="min-h-3 flex-1" />
    </PageShell>
  );
}
