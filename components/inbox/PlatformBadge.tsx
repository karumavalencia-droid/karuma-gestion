import { AtSign, FlaskConical, Globe, MapPin, MessageCircle, Star } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Distintivo de plataforma. Se usa el mismo componente en la bandeja y en la
 * conversación para que un mensaje se identifique de un vistazo.
 */
type Estilo = { label: string; icon: LucideIcon; clase: string };

const ESTILOS: Record<string, Estilo> = {
  instagram: {
    label: "Instagram",
    icon: AtSign,
    clase: "bg-pink-50 text-pink-700 ring-pink-100",
  },
  google: {
    label: "Google",
    icon: Star,
    clase: "bg-amber-50 text-amber-700 ring-amber-100",
  },
  tripadvisor: {
    label: "Tripadvisor",
    icon: MapPin,
    clase: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  },
  manual: {
    label: "Pruebas",
    icon: FlaskConical,
    clase: "bg-gray-100 text-gray-600 ring-gray-200",
  },
};

const POR_DEFECTO: Estilo = {
  label: "Otro",
  icon: Globe,
  clase: "bg-gray-100 text-gray-600 ring-gray-200",
};

export function PlatformBadge({
  platform,
  soloIcono = false,
}: {
  platform: string;
  soloIcono?: boolean;
}) {
  const estilo = ESTILOS[platform] ?? POR_DEFECTO;
  const Icon = estilo.icon;

  if (soloIcono) {
    return (
      <span
        className={`inline-flex h-6 w-6 items-center justify-center rounded-md ring-1 ${estilo.clase}`}
        title={estilo.label}
        aria-label={estilo.label}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ${estilo.clase}`}
    >
      <Icon className="h-3 w-3" />
      {estilo.label}
    </span>
  );
}

/** Tipo de mensaje: DM, comentario, mención, reseña… */
export function KindBadge({ kind }: { kind: string }) {
  const etiquetas: Record<string, string> = {
    dm: "Mensaje",
    comment: "Comentario",
    mention: "Mención",
    story_reply: "Respuesta a story",
    review: "Reseña",
    question: "Pregunta",
  };
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">
      <MessageCircle className="h-3 w-3" />
      {etiquetas[kind] ?? kind}
    </span>
  );
}
