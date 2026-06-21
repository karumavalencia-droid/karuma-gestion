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

// KARUMA: humanista elegante sin serifas (estilo Optima), no un serif de alto contraste
const WORDMARK = '"Optima","Optima Nova LT Pro","Gill Sans","Gill Sans MT","Albertus MT","Trebuchet MS",sans-serif';
const SCRIPT = '"Snell Roundhand","Apple Chancery","Brush Script MT","Segoe Script",cursive';

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
      <span className={`text-[1.35rem] font-medium tracking-[0.16em] ${main}`} style={{ fontFamily: WORDMARK }}>
        KARUMA
      </span>
      <span className={`-mt-0.5 self-end pr-0.5 text-[0.95rem] ${sub}`} style={{ fontFamily: SCRIPT }}>
        Sushi &amp; grill
      </span>
    </div>
  );
}
