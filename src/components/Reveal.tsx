"use client";

import { useEffect, useRef } from "react";

/**
 * Révélation au défilement. Un seul observateur partagé, et l'élément
 * est libéré dès qu'il est apparu : rien ne traîne en mémoire.
 */
export function Reveal({
  children, delay = 0, className = "", as: Tag = "div",
}: {
  children: React.ReactNode; delay?: number; className?: string;
  as?: "div" | "section" | "li" | "article" | "header" | "figure";
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") { el.classList.add("is-in"); return; }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.transitionDelay = `${delay}ms`;
          el.classList.add("is-in");
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [delay]);

  const Component = Tag as React.ElementType;
  return <Component ref={ref} className={`reveal ${className}`}>{children}</Component>;
}
