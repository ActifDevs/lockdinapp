import type { ReactNode, RefObject } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type ResponsiveFormPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
  returnFocusRef?: RefObject<HTMLElement | null>;
};

export function ResponsiveFormPanel({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
  returnFocusRef,
}: ResponsiveFormPanelProps) {
  const isMobile = useIsMobile();
  const restoreTriggerFocus = (event: Event) => {
    const trigger = returnFocusRef?.current;
    if (!trigger?.isConnected) return;
    event.preventDefault();
    trigger.focus();
  };

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          onCloseAutoFocus={restoreTriggerFocus}
          className={cn(
            "max-h-[min(92dvh,720px)] overflow-y-auto rounded-t-2xl border-t border-border/60 pb-[env(safe-area-inset-bottom)]",
            className,
          )}
        >
          <SheetHeader className="text-left">
            <SheetTitle>{title}</SheetTitle>
            {description ? <SheetDescription>{description}</SheetDescription> : null}
          </SheetHeader>
          <div className="mt-4">{children}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={className} onCloseAutoFocus={restoreTriggerFocus}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
