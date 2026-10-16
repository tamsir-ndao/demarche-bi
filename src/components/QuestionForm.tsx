import Form from "next/form";
import { LONGUEUR_MAX_QUESTION } from "@/lib/texte";
import { Icon } from "./Icon";

/**
 * Le champ où l'on écrit sa question. Il ouvre /reponse?q=… : l'adresse peut se partager.
 * `valeurInitiale` remplit le champ (pour reformuler une question qui était trop vague).
 */
export function QuestionForm({ id, valeurInitiale }: { id: string; valeurInitiale?: string }) {
  return (
    <Form action="/reponse" className="relative w-full">
      <label htmlFor={id} className="sr-only">
        Écris ta question
      </label>
      <input
        id={id}
        name="q"
        type="text"
        defaultValue={valeurInitiale}
        maxLength={LONGUEUR_MAX_QUESTION}
        autoComplete="off"
        enterKeyHint="search"
        placeholder="Écris ta question"
        className="block h-14 w-full rounded-full border-[1.5px] border-edge bg-card pr-16 pl-[22px] text-[17px] leading-6 text-ink placeholder:text-ink-3 focus:border-leaf lg:h-16 lg:pr-[76px] lg:pl-[26px] lg:text-lg"
      />
      <button
        type="submit"
        aria-label="Chercher"
        className="press absolute top-1.5 right-1.5 flex size-11 items-center justify-center rounded-full bg-brand text-on-brand lg:size-[52px]"
      >
        <Icon name="fleche-droite" size={22} strokeWidth={2.4} />
      </button>
    </Form>
  );
}
