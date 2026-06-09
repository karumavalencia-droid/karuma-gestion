interface PageHeaderProps {
  title?: string;
  description?: string;
  children?: React.ReactNode;
  /** El título ya aparece en el Header del layout; solo mostrar descripción */
  hideTitle?: boolean;
}

export function PageHeader({ title, description, children, hideTitle = false }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        {!hideTitle && title && (
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">{title}</h1>
        )}
        {description && (
          <p
            className={
              hideTitle
                ? "text-sm text-gray-500"
                : "mt-1 text-sm text-gray-500"
            }
          >
            {description}
          </p>
        )}
      </div>
      {children && <div className="flex items-center gap-3">{children}</div>}
    </div>
  );
}
