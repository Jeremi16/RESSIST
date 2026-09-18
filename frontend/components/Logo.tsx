import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface LogoProps {
  /** Ukuran kotak logo (px). */
  size?: number;
  /** Tampilkan wordmark "Ressist" di samping logo. */
  showWordmark?: boolean;
  /** "light" = di atas background terang (teks biru tua), "dark" = di atas background gelap (teks putih). */
  variant?: "light" | "dark";
  /** Bungkus dengan Link ke path ini; null = tanpa link. */
  to?: string | null;
  className?: string;
}

/**
 * Logo Ressist — monogram R (biru tua #0059D0 + aksen biru muda #60A8F8).
 * Satu-satunya tempat definisi logo agar tidak drift antar halaman.
 */
export function Logo({
  size = 32,
  showWordmark = true,
  variant = "light",
  to = "/",
  className,
}: LogoProps) {
  const content = (
    <>
      <img
        src="/logo-mark.png"
        alt="Logo Ressist"
        width={size}
        height={size}
        style={{ width: size, height: size, borderRadius: Math.round(size * 0.14) }}
        className="object-contain shrink-0"
      />
      {showWordmark && (
        <span
          className={cn(
            "text-[15px] font-semibold tracking-tight",
            variant === "dark" ? "text-white" : "text-[#0059D0]",
          )}
        >
          Ressist
        </span>
      )}
    </>
  );

  const wrapClass = cn("flex items-center gap-2", className);

  if (to === null) return <span className={wrapClass}>{content}</span>;
  return (
    <Link to={to} className={wrapClass}>
      {content}
    </Link>
  );
}
