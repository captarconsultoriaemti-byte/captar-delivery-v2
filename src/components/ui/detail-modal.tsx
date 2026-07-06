import { X } from "lucide-react";
import { IconAction } from "@/components/ui/icon-action";

export function DetailModal({
  title,
  onClose,
  children,
}: {
  title: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-lg bg-white shadow-xl">
        <div className="flex shrink-0 items-center justify-between p-6 pb-2">
          <h2 className="text-lg font-semibold">{title}</h2>
          <IconAction icon={X} label="Fechar" onClick={onClose} />
        </div>
        <div className="grid grid-cols-2 gap-4 overflow-y-auto px-6 pb-6">{children}</div>
      </div>
    </div>
  );
}

export function DetailField({
  label,
  value,
  fullWidth = false,
}: {
  label: string;
  value: React.ReactNode;
  fullWidth?: boolean;
}) {
  return (
    <div className={fullWidth ? "col-span-2" : ""}>
      <p className="text-xs text-secondary">{label}</p>
      <div className="text-sm font-medium">
        {value === null || value === undefined || value === "" ? "-" : value}
      </div>
    </div>
  );
}
