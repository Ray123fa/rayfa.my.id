import { AlertDialog as Primitive } from "@base-ui/react/alert-dialog";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

// Base UI composition and visual tokens used by neobrutalism.dev's Alert Dialog.
export const AlertDialog = Primitive.Root;
export const AlertDialogTitle = Primitive.Title;
export const AlertDialogDescription = Primitive.Description;

export function AlertDialogContent({
  className,
  ...props
}: ComponentProps<typeof Primitive.Popup>) {
  return (
    <Primitive.Portal>
      <Primitive.Backdrop className="fixed inset-0 z-50 bg-overlay" />
      <Primitive.Popup
        className={cn(
          "fixed left-1/2 top-1/2 z-50 grid max-h-[calc(100dvh-3rem)] w-[calc(100%-3rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto rounded-base border-2 border-border bg-secondary-background p-6 text-foreground shadow-shadow",
          className,
        )}
        {...props}
      />
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
        "inline-flex min-h-11 items-center justify-center rounded-base border-2 border-border bg-main px-4 py-2 font-heading text-main-foreground shadow-shadow transition-[transform,box-shadow] hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none",
        className,
      )}
      {...props}
    />
  );
}
