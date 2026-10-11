/** La question de la personne, affichée comme un message envoyé. */
export function BulleQuestion({ question }: { question: string }) {
  return (
    <p className="mt-1 max-w-[300px] self-end rounded-[22px_22px_6px_22px] bg-tint-2 px-4 py-3 text-base leading-6 font-semibold lg:max-w-[360px]">
      {question}
    </p>
  );
}
