import * as React from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const getInitial = () =>
    typeof window !== "undefined" ? window.innerWidth < MOBILE_BREAKPOINT : false;

  const [isMobile, setIsMobile] = React.useState<boolean>(getInitial);

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = (e: MediaQueryListEvent | MediaQueryList) => {
      // Some browsers pass MediaQueryListEvent, others pass MediaQueryList
      // so check for `matches` in both.
      // @ts-ignore
      setIsMobile(Boolean((e && (e as any).matches) || window.innerWidth < MOBILE_BREAKPOINT));
    };

    // Use the current match value initially.
    setIsMobile(mql.matches);

    // Attach listener.
    if (mql.addEventListener) {
      mql.addEventListener("change", onChange as EventListener);
      return () => mql.removeEventListener("change", onChange as EventListener);
    } else {
      // Fallback for older browsers
      // @ts-ignore
      mql.addListener(onChange);
      // @ts-ignore
      return () => mql.removeListener(onChange);
    }
  }, []);

  return isMobile;
}
