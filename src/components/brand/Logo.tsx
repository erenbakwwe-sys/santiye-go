import Image from 'next/image';
import Link from 'next/link';

/**
 * ŞantiyeGO resmi logosu (public/brand).
 *  - logo.png / logo-light.png           : yatay logo (işaret + yazı)
 *  - logo-full.png / logo-full-light.png : sloganlı logo
 *  - logo-mark.png / logo-mark-light.png : yalnızca işaret
 * "-light" sürümleri koyu zemin içindir (lacivert kısımlar beyaz).
 */

const SIZES = {
  logo: { w: 734, h: 160 },
  'logo-full': { w: 1101, h: 240 },
  'logo-mark': { w: 412, h: 256 },
} as const;

type Variant = keyof typeof SIZES;

function BrandImage({
  variant,
  tone = 'dark',
  height,
  className = '',
  priority = false,
}: {
  variant: Variant;
  tone?: 'dark' | 'light';
  height: number;
  className?: string;
  priority?: boolean;
}) {
  const size = SIZES[variant];
  const width = Math.round((size.w * height) / size.h);
  const file = tone === 'light' ? `${variant}-light` : variant;
  return (
    <Image
      src={`/brand/${file}.png`}
      alt="ŞantiyeGO"
      width={width}
      height={height}
      priority={priority}
      className={className}
      style={{ height, width: 'auto' }}
    />
  );
}

export function LogoMark({
  className = '',
  height = 32,
  tone = 'dark',
}: {
  className?: string;
  height?: number;
  tone?: 'dark' | 'light';
}) {
  return <BrandImage variant="logo-mark" tone={tone} height={height} className={className} />;
}

export function LogoFull({
  className = '',
  height = 56,
  tone = 'dark',
}: {
  className?: string;
  height?: number;
  tone?: 'dark' | 'light';
}) {
  return <BrandImage variant="logo-full" tone={tone} height={height} className={className} />;
}

export default function Logo({
  tone = 'dark',
  href = '/',
  height = 36,
}: {
  tone?: 'dark' | 'light';
  href?: string;
  height?: number;
}) {
  return (
    <Link href={href} className="flex items-center shrink-0" aria-label="ŞantiyeGO ana sayfa">
      <BrandImage variant="logo" tone={tone} height={height} priority />
    </Link>
  );
}
