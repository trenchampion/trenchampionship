"use client";

import Link from "next/link";
import { useMemo, type ReactNode } from "react";
import { characterImageUri, type Traits } from "@traitleague/engine";
import { ELEMENTS, SPECIALS } from "@/lib/format";

/** What the artwork needs: the seven traits and the id; the name labels it. An indexer `CharacterRow` satisfies it. */
export type ArtSubject = Traits & { id: string | number | bigint; name: string };

/** The seven battle traits of an indexer row (or of anything carrying the trait fields). */
export function traitsOf(c: Traits): Traits {
  return { strength: c.strength, defense: c.defense, speed: c.speed, focus: c.focus, element: c.element, special: c.special, weakness: c.weakness };
}

/**
 * Deterministic character portrait, byte-identical to what `ControllerNFT.tokenURI` renders on chain
 * (`engine/src/vectorart.ts` mirrors `CharacterPortrait.sol`; both are checked against shared vectors).
 * Rendered as an <img> with a data URI, so the SVG is isolated exactly as a wallet or marketplace shows it.
 * `fluid` fills the parent's width (square) instead of a fixed pixel size.
 */
export function CharacterArt({ character, size = 40, fluid, className = "", alt, title }: { character: ArtSubject; size?: number; fluid?: boolean; className?: string; alt?: string; title?: string }) {
  const { id, name, strength, defense, speed, focus, element, special, weakness } = character;
  const src = useMemo(
    () => characterImageUri(BigInt(id), { strength, defense, speed, focus, element, special, weakness }),
    [id, strength, defense, speed, focus, element, special, weakness],
  );
  const label = alt ?? `${name}: ${ELEMENTS[element] ?? "unknown"} character, ${special > 0 ? `${SPECIALS[special] ?? "unknown"} special` : "no special"}, weak to ${ELEMENTS[weakness] ?? "unknown"}`;
  const small = !fluid && size <= 32;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={label}
      title={title}
      width={size}
      height={size}
      className={`art ${small ? "art-xs" : ""} ${fluid ? "art-fluid" : ""} ${className}`}
      style={fluid ? undefined : { width: size, height: size }}
      draggable={false}
    />
  );
}

/** Thumbnail plus the linked name, for tables and lists; extra badges go in `children`. */
export function CharacterChip({ character, size = 32, children, className = "" }: { character: ArtSubject; size?: number; children?: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <CharacterArt character={character} size={size} alt="" />
      <span className="flex min-w-0 flex-wrap items-center gap-2">
        <Link href={`/character/?id=${character.id}`} className="strong font-medium hover:text-[var(--accent)]">
          {character.name}
        </Link>
        {children}
      </span>
    </span>
  );
}
