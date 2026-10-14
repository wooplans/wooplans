import Link from "next/link";

/** Logo officiel WOOPLANS (variante négative : blanc sur vert). Ne pas recomposer en texte. */
export function Logo({ href = "/", height = 36 }: { href?: string; height?: number }) {
  return (
    <Link href={href} className="inline-flex shrink-0 items-center" aria-label="WOOPLANS — accueil">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/assets/wooplans-logo-white.png"
        alt="WOOPLANS"
        width={Math.round((267 / 80) * height)}
        height={height}
        style={{ height, width: "auto" }}
      />
    </Link>
  );
}
