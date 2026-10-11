import { URL_CONTRIBUER } from "@/lib/liens";
import { LienBouton } from "./LienBouton";

/** Invite à proposer une démarche qui manque : le contenu est ouvert à tous sur GitHub. */
export function ProposerUneDemarche({ disposition }: { disposition: "ligne" | "bloc" }) {
  if (disposition === "ligne") {
    return (
      <section aria-label="Proposer une démarche" className="mt-4 flex items-center gap-3.5 rounded-3xl bg-tint px-4 py-3.5">
        <p className="min-w-0 flex-1">
          <span className="block text-base leading-[22px] font-bold">Il manque une démarche&nbsp;?</span>
          <span className="mt-0.5 block text-sm leading-5 text-ink-2">Propose-la, c’est ouvert à tous.</span>
        </p>
        <LienBouton href={URL_CONTRIBUER} externe variante="secondaire" taille="petit" className="flex-none">
          Proposer
        </LienBouton>
      </section>
    );
  }
  return (
    <section aria-label="Proposer une démarche" className="mt-5 rounded-3xl bg-tint p-[18px]">
      <p className="text-[17px] leading-6 font-bold">Il manque une démarche&nbsp;?</p>
      <p className="mt-1 text-[15px] leading-[22px] text-ink-2">Propose-la, c’est ouvert à tous.</p>
      <LienBouton href={URL_CONTRIBUER} externe variante="secondaire" taille="petit" icone="lien-externe" className="mt-3 w-fit">
        Proposer une démarche
      </LienBouton>
    </section>
  );
}
