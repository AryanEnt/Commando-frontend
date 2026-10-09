"use client";

import { Toaster } from "sonner";
import { CircleAlert, CircleCheck, Info, LoaderCircle, TriangleAlert, X } from "lucide-react";

const ICON_SIZE = 16;

export function AppToaster() {
  return (
    <Toaster
      position="top-right"
      theme="light"
      closeButton
      duration={4000}
      visibleToasts={4}
      gap={8}
      offset={{ top: "calc(var(--header-h) + 0.75rem)", right: "1rem" }}
      mobileOffset={{ top: "calc(var(--header-h) + 0.5rem)", left: "0.75rem", right: "0.75rem" }}
      className="app-toaster"
      containerAriaLabel="Notifications"
      icons={{
        success: <CircleCheck size={ICON_SIZE} strokeWidth={2.25} />,
        error: <CircleAlert size={ICON_SIZE} strokeWidth={2.25} />,
        warning: <TriangleAlert size={ICON_SIZE} strokeWidth={2.25} />,
        info: <Info size={ICON_SIZE} strokeWidth={2.25} />,
        loading: (
          <LoaderCircle
            size={ICON_SIZE}
            strokeWidth={2.25}
            className="animate-spin motion-reduce:animate-none"
          />
        ),
        close: <X size={12} strokeWidth={2.5} />,
      }}
      toastOptions={{
        closeButtonAriaLabel: "Dismiss notification",
        classNames: { toast: "app-toast" },
      }}
    />
  );
}
