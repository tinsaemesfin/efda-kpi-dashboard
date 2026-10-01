"use client";

import { useState, type ReactNode } from "react";
import { Maximize2Icon, Minimize2Icon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TableFullscreenProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  toolbarClassName?: string;
}

/** Wraps a table with a maximize control that opens an in-app fullscreen overlay. */
export function TableFullscreen({
  title,
  description,
  children,
  className,
  toolbarClassName,
}: TableFullscreenProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className={cn("min-w-0", className)}>
      <div className={cn("mb-2 flex items-center justify-end", toolbarClassName)}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={() => setOpen(true)}
          aria-label={`View ${title} fullscreen`}
        >
          <Maximize2Icon className="size-3.5" aria-hidden="true" />
          Full screen
        </Button>
      </div>

      {children}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="flex h-viewport max-h-viewport w-viewport max-w-none translate-x-[-50%] translate-y-[-50%] flex-col gap-0 rounded-none border-0 p-0 sm:rounded-none"
          {...(!description ? { "aria-describedby": undefined } : {})}
        >
          <DialogHeader className="shrink-0 flex-row items-center justify-between space-y-0 border-b px-4 py-3 pr-14 text-left sm:px-6">
            <div className="min-w-0">
              <DialogTitle className="truncate text-base">{title}</DialogTitle>
              {description ? (
                <DialogDescription className="mt-0.5 truncate text-xs">
                  {description}
                </DialogDescription>
              ) : null}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="hidden h-8 gap-1.5 text-xs sm:inline-flex"
              onClick={() => setOpen(false)}
            >
              <Minimize2Icon className="size-3.5" aria-hidden="true" />
              Exit
            </Button>
          </DialogHeader>
          <div data-slot="table-fullscreen-body" className="min-h-0 flex-1 overflow-auto px-4 py-4 sm:px-6">
            {children}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
