"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { stockageLocal } from "@/lib/bienvenue";
import { dateDeConversation, fermerDiscussion, lireHistorique, PARAMETRE_CONVERSATION, supprimerConversation, type ConversationGardee } from "@/lib/conversation/historique";
import { Icon } from "./Icon";

/** Les conversations gardées sur le téléphone : un appui les rouvre, deux appuis en suppriment une. */
export function ListeHistorique() {
  const [liste, setListe] = useState<ConversationGardee[] | null>(null);
  const [maintenant, setMaintenant] = useState(0);
  const [aConfirmer, setAConfirmer] = useState<string | null>(null);

  // Après le premier dessin : le serveur ne connaît pas la mémoire du téléphone.
  useEffect(() => {
    fermerDiscussion();
    const trame = requestAnimationFrame(() => {
      setMaintenant(Date.now());
      setListe(lireHistorique(stockageLocal()));
    });
    return () => cancelAnimationFrame(trame);
  }, []);

  function supprimer(id: string) {
    if (aConfirmer !== id) {
      setAConfirmer(id);
      return;
    }
    supprimerConversation(stockageLocal(), id);
    setListe(lireHistorique(stockageLocal()));
    setAConfirmer(null);
  }

  if (liste === null) return null;

  if (liste.length === 0) {
    return (
      <div className="mt-10 flex flex-col items-center gap-4 px-4 text-center">
        <span aria-hidden="true" className="flex size-14 items-center justify-center rounded-2xl bg-tint text-leaf">
          <Icon name="horloge" size={26} />
        </span>
        <p className="text-[17px] leading-[26px] text-ink-2">Tes conversations apparaîtront ici.</p>
        <Link href="/" className="press flex min-h-12 items-center rounded-full bg-brand px-6 text-[16px] leading-5 font-bold text-on-brand">
          Poser une question
        </Link>
      </div>
    );
  }

  return (
    <>
      <p className="mx-1 mt-2 text-[15px] leading-[22px] text-ink-2">Gardées sur ce téléphone uniquement.</p>
      <ul className="mt-4 flex flex-col divide-y divide-line overflow-hidden rounded-2xl bg-card">
        {liste.map((conversation) => (
          <li key={conversation.id} className="flex items-center">
            <Link
              href={`/?${PARAMETRE_CONVERSATION}=${encodeURIComponent(conversation.id)}`}
              className="press flex min-h-[68px] min-w-0 flex-1 flex-col justify-center py-3 pr-2 pl-4"
            >
              <span className="truncate text-[16px] leading-[22px] font-semibold">{conversation.tours[0]?.question}</span>
              <span className="text-[13px] leading-[18px] text-ink-2">{dateDeConversation(conversation.maj, maintenant)}</span>
            </Link>
            <button
              type="button"
              onClick={() => supprimer(conversation.id)}
              onBlur={() => setAConfirmer(null)}
              aria-label={`Supprimer la conversation : ${conversation.tours[0]?.question ?? ""}`}
              className={`press mr-2 flex min-h-11 flex-none items-center justify-center rounded-full text-[14px] leading-5 font-semibold ${
                aConfirmer === conversation.id ? "bg-tint px-3.5" : "w-11 text-ink-2"
              }`}
            >
              {aConfirmer === conversation.id ? "Supprimer" : <Icon name="poubelle" size={20} />}
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
