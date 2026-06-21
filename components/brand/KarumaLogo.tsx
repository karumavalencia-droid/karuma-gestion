/**
 * Logotipo de marca "KARUMA · Sushi & grill".
 *
 * Recreación con tipografías del sistema (sin dependencias). Para usar el
 * logo EXACTO del PDF, guarda un PNG transparente en:
 *   public/logo-karuma-white.png  (versión clara, para fondos oscuros)
 *   public/logo-karuma.png        (versión oscura, para fondos claros)
 * y cambia `USAR_IMAGEN` a true.
 */

const USAR_IMAGEN = false;

const SERIF = '"Didot","Bodoni 72","Bodoni MT","Playfair Display",Georgia,serif';
const SCRIPT = '"Snell Roundhand","Brush Script MT","Segoe Script","Apple Chancery",cursive';

export function KarumaLogo({
  tone = "light",
  className = "",
}: {
  tone?: "light" | "dark";
  className?: string;
}) {
  if (USAR_IMAGEN) {
    const src = tone === "light" ? "/logo-karuma-white.png" : "/logo-karuma.png";
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="Karuma · Sushi & grill" className={className} />;
  }

  const main = tone === "light" ? "text-white" : "text-gray-900";
  const sub = tone === "light" ? "text-gray-300" : "text-gray-500";

  return (
    <div className={`flex select-none flex-col justify-center leading-none ${className}`}>
      <span className={`text-xl font-semibold tracking-[0.22em] ${main}`} style={{ fontFamily: SERIF }}>
        KARUMA
      </span>
      <span className={`-mt-1 self-end text-base ${sub}`} style={{ fontFamily: SCRIPT }}>
        Sushi &amp; grill
      </span>
    </div>
  );
}
