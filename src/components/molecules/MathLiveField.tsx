"use client";

import { useEffect, useRef } from "react";

interface MathLiveFieldProps {
  onChange: (latex: string) => void;
}

export function MathLiveField({ onChange }: MathLiveFieldProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  // eslint-disable-next-line react-hooks/refs
  onChangeRef.current = onChange;

  useEffect(() => {
    let mf: HTMLElement | null = null;
    // `cancelled` prevents the async import from running after unmount.
    // Without it, React 18 Strict Mode's double-invoke pattern fires the
    // effect twice; the first import promise resolves after cleanup (when
    // `mf` is still null) so nothing is removed, then the second mount's
    // import also resolves — resulting in two math-field elements.
    let cancelled = false;

    import("mathlive").then(() => {
      if (cancelled || !containerRef.current) return;

      // Clear any stale element left by a previous Strict Mode cycle
      containerRef.current.innerHTML = "";

      mf = document.createElement("math-field");

      Object.assign(mf.style, {
        width: "100%",
        display: "block",
        fontSize: "22px",
        padding: "10px 14px",
        borderRadius: "8px",
        border: "1px solid #D0D5DD",
        minHeight: "58px",
        background: "#FAFAFA",
        outline: "none",
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mf as any).setAttribute("virtual-keyboard-mode", "manual");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mf as any).setAttribute("smart-mode", "true");

      mf.addEventListener("input", (e: Event) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onChangeRef.current((e.target as any).value ?? "");
      });

      containerRef.current.appendChild(mf);
      // MathLive initialises its internal state asynchronously after connectedCallback;
      // focus() can throw "this.mathfield is undefined" if called too early.
      setTimeout(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (!cancelled) try { (mf as any)?.focus?.(); } catch {}
      }, 80);
    });

    return () => {
      cancelled = true;
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const container = containerRef.current;
      if (mf && container?.contains(mf)) {
        container.removeChild(mf);
      }
    };
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <div ref={containerRef} className="w-full" />
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10.5px] text-[#98A2B3]">
        <span><code className="bg-[#F0F2F5] px-1 rounded">/</code> fraction</span>
        <span><code className="bg-[#F0F2F5] px-1 rounded">^</code> power</span>
        <span><code className="bg-[#F0F2F5] px-1 rounded">_</code> subscript</span>
        <span><code className="bg-[#F0F2F5] px-1 rounded">\sqrt</code> root</span>
        <span><code className="bg-[#F0F2F5] px-1 rounded">\xrightarrow</code> labeled arrow</span>
        <span><code className="bg-[#F0F2F5] px-1 rounded">\alpha</code> Greek</span>
      </div>
    </div>
  );
}
