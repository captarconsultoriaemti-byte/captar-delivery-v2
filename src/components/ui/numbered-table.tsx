import type { ReactNode } from "react";

interface Column<T> {
  header: string;
  render: (row: T) => ReactNode;
}

interface NumberedTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  emptyMessage?: string;
}

export function NumberedTable<T>({
  columns,
  rows,
  rowKey,
  emptyMessage = "Nenhum registro encontrado.",
}: NumberedTableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-secondary/45 text-secondary">
            <th className="w-12 py-2 pr-2 font-medium">#</th>
            {columns.map((col) => (
              <th key={col.header} className="py-2 pr-4 font-medium whitespace-nowrap">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length + 1} className="py-6 text-center text-secondary">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={rowKey(row)} className="border-b border-secondary/30">
                <td className="py-2 pr-2 text-secondary">{index + 1}</td>
                {columns.map((col) => (
                  <td key={col.header} className="py-2 pr-4">
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
