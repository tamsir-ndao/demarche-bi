import { Icon } from "./Icon";

/** Ce qu'on voit pendant que la réponse se prépare. */
export function Recherche() {
  return (
    <section
      role="status"
      aria-labelledby="titre-recherche"
      className="mt-16 flex flex-col items-center text-center"
    >
      <span aria-hidden="true" className="relative flex size-[168px] items-center justify-center">
        <span className="absolute inset-0 animate-breathe rounded-full bg-tint" />
        <span className="absolute inset-[18px] animate-breathe rounded-full bg-tint-2 [animation-delay:0.5s]" />
        <span className="relative flex size-24 items-center justify-center rounded-full bg-brand text-on-brand shadow-[0_12px_28px_rgb(34_209_131_/_0.45)]">
          <Icon name="loupe" size={42} />
        </span>
      </span>
      <h1 id="titre-recherche" className="mt-4 text-[30px] leading-9 font-bold tracking-[-0.01em]">
        Je cherche…
      </h1>
      <p className="mt-2 text-base leading-6 text-ink-2">Je cherche dans les sources officielles.</p>
    </section>
  );
}
