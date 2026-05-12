"use client";

import Image from "next/image";
import Link from "next/link";

type Props = {
  /** Se definido, o logo envolve um link (ex.: `/dashboard` no app autenticado). */
  href?: string;
  className?: string;
  imgClassName?: string;
  /** Classes do `<Link>` (ex.: anel de foco em fundo claro). */
  linkClassName?: string;
  onLinkClick?: () => void;
  priority?: boolean;
};

export function BrandLogo({
  href,
  className = "",
  imgClassName = "",
  linkClassName = "",
  onLinkClick,
  priority,
}: Props) {
  const img = (
    <Image
      src="/logo-new.png"
      alt="MyGestão"
      width={320}
      height={96}
      className={`h-auto w-full max-w-[min(100%,14rem)] object-contain object-left ${imgClassName}`}
      priority={priority}
    />
  );

  if (href) {
    return (
      <Link
        href={href}
        onClick={onLinkClick}
        className={`inline-block max-w-full rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${linkClassName} ${className}`}
      >
        {img}
      </Link>
    );
  }

  return <div className={`inline-block max-w-full ${className}`}>{img}</div>;
}
