interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
  hideOnMobile?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  mobileLabel?: (item: T) => string;
}

export function DataTable<T>({ columns, data, keyExtractor, mobileLabel }: DataTableProps<T>) {
  return (
    <>
      {/* Vista móvil: tarjetas */}
      <div className="space-y-3 md:hidden">
        {data.map((item) => (
          <div
            key={keyExtractor(item)}
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
          >
            {mobileLabel && (
              <p className="mb-3 text-sm font-semibold text-gray-900">{mobileLabel(item)}</p>
            )}
            <dl className="space-y-2">
              {columns
                .filter((col) => !mobileLabel || col.key !== "id")
                .map((col) => (
                  <div key={col.key} className="flex items-center justify-between gap-2">
                    <dt className="text-xs text-gray-500">{col.header}</dt>
                    <dd className="text-right text-sm font-medium text-gray-900">
                      {col.render
                        ? col.render(item)
                        : String((item as Record<string, unknown>)[col.key] ?? "")}
                    </dd>
                  </div>
                ))}
            </dl>
          </div>
        ))}
      </div>

      {/* Vista escritorio: tabla */}
      <div className="hidden overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm md:block">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 lg:px-6 ${col.className ?? ""}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {data.map((item) => (
              <tr key={keyExtractor(item)} className="transition-colors hover:bg-gray-50">
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`whitespace-nowrap px-4 py-3.5 text-sm text-gray-700 lg:px-6 ${col.className ?? ""}`}
                  >
                    {col.render
                      ? col.render(item)
                      : String((item as Record<string, unknown>)[col.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
