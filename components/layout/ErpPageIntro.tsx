"use client";

interface ErpPageIntroProps {
  /** Línea superior opcional, por ejemplo una etiqueta de periodo. */
  lead?: string;
  /** Descripción de la página, normalmente desde i18n. */
  description: string;
  /** Zona de acciones a la derecha. */
  actions?: React.ReactNode;
}

/** Cabecera descriptiva; el título principal lo muestra el layout. */
export function ErpPageIntro({ lead, description, actions }: ErpPageIntroProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        {lead && <p className="text-sm font-medium text-gray-900">{lead}</p>}
        <p className={`text-sm text-gray-500 ${lead ? "" : ""}`}>{description}</p>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}
