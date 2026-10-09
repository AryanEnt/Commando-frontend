import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

let currentPath: string | null = null;
let previousPath: string | null = null;

/** Mount once in the app shell so pages can link back to wherever the user came from. */
export function useTrackNavigation(): void {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname === currentPath) return;
    previousPath = currentPath;
    currentPath = pathname;
  }, [pathname]);
}

/**
 * The in-app page visited before the current one, captured on mount.
 * Null after a full page load, since there is no in-app history to return to.
 */
export function usePreviousPath(): string | null {
  const pathname = usePathname();
  // Child effects run before the shell's tracker, so on first render the tracker may not have advanced yet.
  const [previous] = useState(() =>
    currentPath !== pathname ? currentPath : previousPath,
  );
  return previous;
}
