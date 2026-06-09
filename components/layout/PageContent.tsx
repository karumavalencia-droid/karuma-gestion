interface PageContentProps {
  children: React.ReactNode;
  className?: string;
}

/** Contenedor unificado del área de contenido (mismo espaciado en todas las páginas ERP). */
export function PageContent({ children, className = "" }: PageContentProps) {
  return <div className={`space-y-6 ${className}`.trim()}>{children}</div>;
}
