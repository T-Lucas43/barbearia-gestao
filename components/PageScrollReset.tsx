"use client";
import { useLayoutEffect, useEffect } from "react";
import { usePathname } from "next/navigation";
export default function PageScrollReset() {
  const pathname = usePathname();
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);
  useEffect(() => {
    const previous = history.scrollRestoration;
    history.scrollRestoration = "manual";
    const reset = () =>
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    window.addEventListener("pageshow", reset);
    return () => {
      history.scrollRestoration = previous;
      window.removeEventListener("pageshow", reset);
    };
  }, []);
  return null;
}
