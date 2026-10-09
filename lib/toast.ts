import { toast as sonner, type ExternalToast } from "sonner";

type Show = (message: string, data?: ExternalToast) => string | number;

/** Identical messages share an id, so a repeated trigger refreshes one toast instead of stacking copies. */
function deduped(show: Show, defaults?: ExternalToast): Show {
  return (message, data) => show(message, { id: message, ...defaults, ...data });
}

export const toast = {
  success: deduped(sonner.success),
  info: deduped(sonner.info),
  warning: deduped(sonner.warning, { richColors: true }),
  error: deduped(sonner.error, { richColors: true, duration: 6000 }),
  loading: sonner.loading,
  promise: sonner.promise,
  dismiss: sonner.dismiss,
};
