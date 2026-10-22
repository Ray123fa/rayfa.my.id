import { useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogButton,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { AdminDialogOptions } from "@/lib/adminDialog";

export default function AdminAlertDialog({
  options,
  resolve,
  origin,
}: {
  options: AdminDialogOptions;
  resolve: (value: boolean) => void;
  origin: HTMLElement | null;
}) {
  const [open, setOpen] = useState(true);
  const result = useRef(false);
  const cancel = useRef<HTMLButtonElement>(null);
  const finish = (value: boolean) => {
    result.current = value;
    setOpen(false);
  };
  return (
    <AlertDialog
      open={open}
      onOpenChange={(value) => {
        if (!value) finish(false);
      }}
      onOpenChangeComplete={(value) => {
        if (!value) resolve(result.current);
      }}
    >
      <AlertDialogContent
        initialFocus={cancel}
        finalFocus={() => (origin?.isConnected ? origin : true)}
      >
        <div className="grid gap-3">
          <AlertDialogTitle className="text-xl font-heading">
            {options.title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm leading-relaxed">
            {options.description}
          </AlertDialogDescription>
        </div>
        <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          {options.confirm && (
            <AlertDialogButton
              ref={cancel}
              style={{ background: "var(--secondary-background)" }}
              onClick={() => finish(false)}
            >
              Batal
            </AlertDialogButton>
          )}
          <AlertDialogButton
            ref={options.confirm ? undefined : cancel}
            onClick={() => finish(true)}
          >
            {options.confirm ? "Hapus" : "Mengerti"}
          </AlertDialogButton>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
