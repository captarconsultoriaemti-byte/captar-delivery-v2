"use client";

import type { ReactNode } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

interface Column<T> {
  header: string;
  render: (row: T) => ReactNode;
}

interface DraggableTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onReorder: (novaOrdem: T[]) => void;
  emptyMessage?: string;
}

function SortableRow<T>({
  id,
  index,
  row,
  columns,
}: {
  id: string;
  index: number;
  row: T;
  columns: Column<T>[];
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  return (
    <tr
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`border-b border-secondary/30 ${isDragging ? "bg-primary/5" : ""}`}
    >
      <td className="w-8 py-2 pr-2">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab text-secondary/50 hover:text-secondary active:cursor-grabbing"
          aria-label="Arrastar para reordenar"
        >
          <GripVertical size={16} />
        </button>
      </td>
      <td className="py-2 pr-2 text-secondary">{index + 1}</td>
      {columns.map((col) => (
        <td key={col.header} className="py-2 pr-4">
          {col.render(row)}
        </td>
      ))}
    </tr>
  );
}

export function DraggableTable<T>({
  columns,
  rows,
  rowKey,
  onReorder,
  emptyMessage = "Nenhum registro encontrado.",
}: DraggableTableProps<T>) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const ids = rows.map(rowKey);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    onReorder(arrayMove(rows, oldIndex, newIndex));
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-secondary/45 text-secondary">
              <th className="w-8 py-2 pr-2 font-medium" />
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
                <td colSpan={columns.length + 2} className="py-6 text-center text-secondary">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                {rows.map((row, index) => (
                  <SortableRow
                    key={rowKey(row)}
                    id={rowKey(row)}
                    index={index}
                    row={row}
                    columns={columns}
                  />
                ))}
              </SortableContext>
            )}
          </tbody>
        </table>
      </div>
    </DndContext>
  );
}
