import { AlertDialog as Primitive } from "@base-ui/react/alert-dialog";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

export const AlertDialog = Primitive.Root;
export const AlertDialogTitle = Primitive.Title;
export const AlertDialogDescription = Primitive.Description;

export function AlertDialogContent({
  className,
  ...props
}: ComponentProps<typeof Primitive.Popup>) {
  return (
    <Primitive.Portal>
      <Primitive.Backdrop className="fixed inset-0 z-50 bg-black/50" />
      <Primitive.Viewport className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <Primitive.Popup
          className={cn(
            "grid w-full max-w-lg gap-4 rounded-base border-2 border-border bg-background p-6 text-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] outline-none",
            className,
          )}
          {...props}
        />
      </Primitive.Viewport>
    </Primitive.Portal>
  );
}

export function AlertDialogButton({
  className,
  ...props
}: ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex min-h-11 items-center justify-center rounded-base border-2 border-border bg-main px-4 py-2 font-heading text-main-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-none",
        className,
      )}
      {...props}
    />
  );
}
