"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import katex from "katex";
import type { Editor } from "@tiptap/react";
import type { MathSuggestionState } from "./MathSuggestionExtension";

// ─── Symbol library ────────────────────────────────────────────────────────────
// Each entry has `tags` for fuzzy matching (space-separated keywords).

const SHORTCUTS = [
  // ─ Templates
  { tags: "frac fraction a/b divide",                 label: "Fraction",          latex: "\\frac{\\square}{\\square}",                     display: "a/b"     },
  { tags: "sqrt square root",                          label: "Square Root",       latex: "\\sqrt{\\square}",                               display: "√x"      },
  { tags: "nroot nth cube cbrt root",                  label: "nth Root",          latex: "\\sqrt[\\square]{\\square}",                     display: "ⁿ√x"     },
  { tags: "pow power exponent sup",                    label: "Power",             latex: "{\\square}^{\\square}",                          display: "xⁿ"      },
  { tags: "sub subscript",                             label: "Subscript",         latex: "{\\square}_{\\square}",                          display: "xₙ"      },
  { tags: "sum sigma summation",                       label: "Sum Σ",             latex: "\\sum_{i=1}^{n}",                               display: "Σ"       },
  { tags: "prod product capital pi",                   label: "Product Π",         latex: "\\prod_{i=1}^{n}",                              display: "Π"       },
  { tags: "int integral",                              label: "Integral",          latex: "\\int",                                          display: "∫"       },
  { tags: "oint contour loop",                         label: "Contour Integral",  latex: "\\oint",                                         display: "∮"       },
  { tags: "iint double integral",                      label: "Double Integral",   latex: "\\iint",                                         display: "∬"       },
  { tags: "lim limit",                                 label: "Limit",             latex: "\\lim_{x \\to \\infty}",                        display: "lim"     },
  { tags: "binom choose combinations nCr",             label: "Binomial nCr",      latex: "\\binom{\\square}{\\square}",                    display: "C(n,r)"  },
  // ─ Greek
  { tags: "alpha a greek",                             label: "Alpha α",           latex: "\\alpha",   display: "α" },
  { tags: "beta b greek",                              label: "Beta β",            latex: "\\beta",    display: "β" },
  { tags: "gamma g greek",                             label: "Gamma γ",           latex: "\\gamma",   display: "γ" },
  { tags: "Gamma G big capital",                       label: "Gamma Γ",           latex: "\\Gamma",   display: "Γ" },
  { tags: "delta d change small",                      label: "Delta δ",           latex: "\\delta",   display: "δ" },
  { tags: "Delta D uppercase change",                  label: "Delta Δ",           latex: "\\Delta",   display: "Δ" },
  { tags: "epsilon e small",                           label: "Epsilon ε",         latex: "\\epsilon", display: "ε" },
  { tags: "eta h greek",                               label: "Eta η",             latex: "\\eta",     display: "η" },
  { tags: "theta angle trig",                          label: "Theta θ",           latex: "\\theta",   display: "θ" },
  { tags: "lambda wavelength greek",                   label: "Lambda λ",          latex: "\\lambda",  display: "λ" },
  { tags: "mu micro mean greek",                       label: "Mu μ",              latex: "\\mu",      display: "μ" },
  { tags: "nu frequency greek",                        label: "Nu ν",              latex: "\\nu",      display: "ν" },
  { tags: "pi circle ratio greek",                     label: "Pi π",              latex: "\\pi",      display: "π" },
  { tags: "rho density greek",                         label: "Rho ρ",             latex: "\\rho",     display: "ρ" },
  { tags: "sigma std deviation small",                 label: "Sigma σ",           latex: "\\sigma",   display: "σ" },
  { tags: "Sigma sum capital greek",                   label: "Sigma Σ",           latex: "\\Sigma",   display: "Σ" },
  { tags: "tau time greek",                            label: "Tau τ",             latex: "\\tau",     display: "τ" },
  { tags: "phi angle flux greek",                      label: "Phi φ",             latex: "\\phi",     display: "φ" },
  { tags: "psi wave function greek",                   label: "Psi ψ",             latex: "\\psi",     display: "ψ" },
  { tags: "omega angular greek",                       label: "Omega ω",           latex: "\\omega",   display: "ω" },
  { tags: "Omega resistance ohm capital",              label: "Omega Ω",           latex: "\\Omega",   display: "Ω" },
  { tags: "xi greek",                                  label: "Xi ξ",              latex: "\\xi",      display: "ξ" },
  { tags: "chi greek",                                 label: "Chi χ",             latex: "\\chi",     display: "χ" },
  // ─ Operators
  { tags: "times cross multiply",                      label: "Times ×",           latex: "\\times",   display: "×" },
  { tags: "div divide",                                label: "Divide ÷",          latex: "\\div",     display: "÷" },
  { tags: "cdot dot center multiply",                  label: "Dot ·",             latex: "\\cdot",    display: "·" },
  { tags: "pm plus minus",                             label: "Plus-Minus ±",      latex: "\\pm",      display: "±" },
  { tags: "mp minus plus",                             label: "Minus-Plus ∓",      latex: "\\mp",      display: "∓" },
  { tags: "inf infty infinity",                        label: "Infinity ∞",        latex: "\\infty",   display: "∞" },
  // ─ Relations
  { tags: "leq le less equal lte",                     label: "≤ Less or Equal",   latex: "\\leq",     display: "≤" },
  { tags: "geq ge greater equal gte",                  label: "≥ Greater or Eq",   latex: "\\geq",     display: "≥" },
  { tags: "neq ne not equal",                          label: "≠ Not Equal",       latex: "\\neq",     display: "≠" },
  { tags: "approx approximately",                      label: "≈ Approx",          latex: "\\approx",  display: "≈" },
  { tags: "equiv equivalent identical",                label: "≡ Equivalent",      latex: "\\equiv",   display: "≡" },
  { tags: "propto proportional",                       label: "∝ Proportional",    latex: "\\propto",  display: "∝" },
  { tags: "sim similar tilde",                         label: "~ Similar",         latex: "\\sim",     display: "~" },
  { tags: "cong congruent",                            label: "≅ Congruent",       latex: "\\cong",    display: "≅" },
  // ─ Arrows
  { tags: "to rightarrow right",                       label: "Arrow →",           latex: "\\rightarrow",         display: "→"     },
  { tags: "leftarrow left",                            label: "Arrow ←",           latex: "\\leftarrow",          display: "←"     },
  { tags: "leftrightarrow both",                       label: "↔ Both",            latex: "\\leftrightarrow",     display: "↔"     },
  { tags: "Rightarrow implies double",                 label: "⟹ Implies",        latex: "\\Rightarrow",         display: "⟹"    },
  { tags: "Leftrightarrow iff biconditional",          label: "⟺ Iff",            latex: "\\Leftrightarrow",     display: "⟺"    },
  { tags: "rightleftharpoons equilibrium reversible",  label: "⇌ Equilibrium",    latex: "\\rightleftharpoons",  display: "⇌"     },
  {
    tags: "xrightarrow reaction arrow above below labeled condition",
    label: "→[above/below]",
    latex: "\\xrightarrow[\\text{below}]{\\text{above}}",
    display: "→[a/b]",
  },
  // ─ Calculus
  { tags: "partial derivative d",                      label: "∂ Partial",         latex: "\\partial",             display: "∂"     },
  { tags: "nabla del gradient",                        label: "∇ Nabla",           latex: "\\nabla",               display: "∇"     },
  { tags: "ddx derivative",                            label: "d/dx",              latex: "\\frac{d}{dx}",         display: "d/dx"  },
  { tags: "dot deriv first",                           label: "Dot (ẋ)",           latex: "\\dot{\\square}",       display: "ẋ"     },
  { tags: "ddot second deriv",                         label: "Double Dot (ẍ)",    latex: "\\ddot{\\square}",      display: "ẍ"     },
  // ─ Accents
  { tags: "bar mean average xbar overline",            label: "Bar x̄",            latex: "\\bar{\\square}",       display: "x̄"    },
  { tags: "vec vector arrow over",                     label: "Vector v⃗",          latex: "\\vec{\\square}",       display: "v⃗"    },
  { tags: "hat unit normal",                           label: "Hat n̂",             latex: "\\hat{\\square}",       display: "n̂"    },
  { tags: "overline segment geometry",                 label: "Overline AB̄",       latex: "\\overline{\\square}",  display: "AB̄"   },
  // ─ Sets & Logic
  { tags: "in element set belong",                     label: "∈ Element Of",      latex: "\\in",     display: "∈" },
  { tags: "notin not element",                         label: "∉ Not In",          latex: "\\notin",  display: "∉" },
  { tags: "subset",                                    label: "⊂ Subset",          latex: "\\subset", display: "⊂" },
  { tags: "cup union",                                 label: "∪ Union",           latex: "\\cup",    display: "∪" },
  { tags: "cap intersection",                          label: "∩ Intersection",    latex: "\\cap",    display: "∩" },
  { tags: "emptyset empty null",                       label: "∅ Empty Set",       latex: "\\emptyset", display: "∅" },
  { tags: "forall all universal",                      label: "∀ For All",         latex: "\\forall", display: "∀" },
  { tags: "exists existential",                        label: "∃ Exists",          latex: "\\exists", display: "∃" },
  { tags: "neg not negate logic",                      label: "¬ Not",             latex: "\\neg",    display: "¬" },
  { tags: "wedge and logic",                           label: "∧ And",             latex: "\\wedge",  display: "∧" },
  { tags: "vee or logic",                              label: "∨ Or",              latex: "\\vee",    display: "∨" },
  { tags: "mathbb R real numbers",                     label: "ℝ Real",            latex: "\\mathbb{R}", display: "ℝ" },
  { tags: "mathbb Z integers",                         label: "ℤ Integers",        latex: "\\mathbb{Z}", display: "ℤ" },
  { tags: "mathbb N natural",                          label: "ℕ Natural",         latex: "\\mathbb{N}", display: "ℕ" },
  // ─ Trig & Functions
  { tags: "sin sine",                                  label: "sin",    latex: "\\sin",    display: "sin"    },
  { tags: "cos cosine",                                label: "cos",    latex: "\\cos",    display: "cos"    },
  { tags: "tan tangent",                               label: "tan",    latex: "\\tan",    display: "tan"    },
  { tags: "arcsin inverse",                            label: "arcsin", latex: "\\arcsin", display: "arcsin" },
  { tags: "arccos inverse cosine",                     label: "arccos", latex: "\\arccos", display: "arccos" },
  { tags: "arctan inverse tangent",                    label: "arctan", latex: "\\arctan", display: "arctan" },
  { tags: "log base logarithm",                        label: "log",    latex: "\\log",    display: "log"    },
  { tags: "ln natural log",                            label: "ln",     latex: "\\ln",     display: "ln"     },
  { tags: "exp exponential",                           label: "exp",    latex: "\\exp",    display: "exp"    },
  { tags: "hbar planck reduced constant",              label: "ℏ h-bar",            latex: "\\hbar",   display: "ℏ" },
  // ─ Geometry
  { tags: "angle triangle geometry",                   label: "∠ Angle",           latex: "\\angle",    display: "∠" },
  { tags: "triangle poly shape",                       label: "△ Triangle",        latex: "\\triangle", display: "△" },
  { tags: "parallel lines",                            label: "∥ Parallel",        latex: "\\parallel", display: "∥" },
  { tags: "perp perpendicular",                        label: "⊥ Perpendicular",   latex: "\\perp",     display: "⊥" },
  { tags: "degree angle",                              label: "° Degree",           latex: "^{\\circ}",  display: "°" },
  // ─ Statistics
  { tags: "bar xbar mean average",                     label: "x̄ Mean",           latex: "\\bar{x}",  display: "x̄" },
  { tags: "zscore z normal standard",                  label: "z-score",           latex: "z = \\frac{x-\\mu}{\\sigma}", display: "(x-μ)/σ" },
  { tags: "normal distribution N",                     label: "Normal Dist.",      latex: "X \\sim N(\\mu,\\sigma^2)", display: "N(μ,σ²)" },
  { tags: "prob probability P",                        label: "P(A)",              latex: "P(A)",      display: "P(A)" },
  { tags: "cond conditional probability",              label: "P(A|B)",            latex: "P(A|B)",    display: "P(A|B)" },
  // ─ Chemistry
  { tags: "H2O water chemistry",                       label: "H₂O",               latex: "\\text{H}_2\\text{O}",       display: "H₂O"  },
  { tags: "CO2 carbon dioxide",                        label: "CO₂",               latex: "\\text{CO}_2",               display: "CO₂"  },
  { tags: "O2 oxygen",                                 label: "O₂",                latex: "\\text{O}_2",                display: "O₂"   },
  { tags: "pH acid base chemistry",                    label: "pH",                latex: "\\text{pH}",                 display: "pH"   },
  { tags: "DeltaH enthalpy thermo",                    label: "ΔH",                latex: "\\Delta H",                  display: "ΔH"   },
  { tags: "DeltaG gibbs free energy",                  label: "ΔG",                latex: "\\Delta G",                  display: "ΔG"   },
  { tags: "Keq equilibrium constant",                  label: "K_eq",              latex: "K_{eq}",                     display: "Keq"  },
  {
    tags: "photosynthesis reaction biology chemistry",
    label: "Photosynthesis",
    latex: "6\\text{CO}_2 + 6\\text{H}_2\\text{O} \\xrightarrow[\\text{chlorophyll}]{\\text{light}} \\text{C}_6\\text{H}_{12}\\text{O}_6 + 6\\text{O}_2",
    display: "6CO₂+…",
  },
  // ─ Biology
  { tags: "F1 first filial generation genetics",       label: "F₁ Generation",     latex: "\\text{F}_1",                display: "F₁"   },
  { tags: "F2 second filial",                          label: "F₂ Generation",     latex: "\\text{F}_2",                display: "F₂"   },
  { tags: "P1 parent parental generation",             label: "P₁ Parent",         latex: "\\text{P}_1",                display: "P₁"   },
  { tags: "ATP energy biology adenosine",              label: "ATP",               latex: "\\text{ATP}",                display: "ATP"  },
  { tags: "ADP energy biology",                        label: "ADP",               latex: "\\text{ADP}",                display: "ADP"  },
  { tags: "DNA transcription RNA mRNA",                label: "DNA→mRNA",          latex: "\\text{DNA} \\xrightarrow{\\text{transcription}} \\text{mRNA}", display: "DNA→mRNA" },
  { tags: "HardyWeinberg genetics allele p q",         label: "Hardy-Weinberg",    latex: "p^2 + 2pq + q^2 = 1",       display: "p²+2pq+q²" },
  { tags: "logistic growth ecology dN dt",             label: "Logistic Growth",   latex: "\\frac{dN}{dt}=rN\\!\\left(1-\\frac{N}{K}\\right)", display: "dN/dt" },
] as const;

type Shortcut = (typeof SHORTCUTS)[number];

function renderDisplay(latex: string): string {
  const safe = latex.replace(/\\square/g, "□");
  try {
    return katex.renderToString(safe, { throwOnError: false, displayMode: false });
  } catch {
    return latex;
  }
}

interface Props {
  state: MathSuggestionState;
  editor: Editor;
  onClose: () => void;
}

export function MathSuggestionPopup({ state, editor, onClose }: Props) {
  const [selected, setSelected] = useState(0);
  const listRef  = useRef<HTMLDivElement>(null);
  const insertRef = useRef<(latex: string) => void>(() => {});

  const results: Shortcut[] = useMemo(() => {
    const q = state.query.toLowerCase().trim();
    if (!q) return SHORTCUTS.slice(0, 10) as unknown as Shortcut[];
    return (SHORTCUTS as unknown as Shortcut[]).filter((s) => {
      const haystack = (s.tags + " " + s.label + " " + s.latex).toLowerCase();
      return q.split(" ").every((word) => haystack.includes(word));
    }).slice(0, 10);
  }, [state.query]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setSelected(0), [results]);

  // eslint-disable-next-line react-hooks/refs
  insertRef.current = (latex: string) => {
    editor
      .chain()
      .focus()
      .deleteRange({ from: state.from, to: state.to })
      .insertContent(`$${latex}$`)
      .run();
    onClose();
  };

  // Capture-phase keyboard handler so arrow keys don't move the TipTap cursor
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault(); e.stopPropagation();
        setSelected((s) => Math.min(s + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault(); e.stopPropagation();
        setSelected((s) => Math.max(s - 1, 0));
      } else if (e.key === "Enter" || e.key === "Tab") {
        const item = results[selected];
        if (item) { e.preventDefault(); e.stopPropagation(); insertRef.current(item.latex); }
      }
    };
    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, [results, selected]);

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.children[selected] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  // Positioning — stays inside viewport
  const vpW   = typeof window !== "undefined" ? window.innerWidth  : 800;
  const vpH   = typeof window !== "undefined" ? window.innerHeight : 600;
  const popW  = 288;
  const popH  = Math.min(results.length * 52 + 44, 320);
  let   left  = state.coords.left;
  let   top   = state.coords.bottom + 6;
  if (left + popW > vpW - 8) left = vpW - popW - 8;
  if (top  + popH > vpH - 8) top  = state.coords.top - popH - 6;

  const content = (
    <div
      style={{
        position: "fixed", top, left, width: popW, zIndex: 9999,
        boxShadow: "0 8px 24px -4px rgba(16,24,40,0.14), 0 0 0 1px rgba(0,0,0,0.06)",
        borderRadius: 10, background: "white", border: "1px solid #EAECF0", overflow: "hidden",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#F2F4F7] bg-[#FAFAFA]">
        <code className="text-[10px] bg-[#DBEDFF] text-[#007FFF] px-1.5 py-0.5 rounded font-bold">
          \{state.query || "…"}
        </code>
        <span className="text-[10px] text-[#98A2B3]">↑↓ · Enter to insert · Esc cancel</span>
      </div>

      {/* Results */}
      <div ref={listRef} style={{ maxHeight: 276, overflowY: "auto" }}>
        {results.length === 0 ? (
          <div className="px-3 py-4 text-xs text-center text-[#98A2B3]">
            No match — try <span className="font-semibold text-[#007FFF]">⌨ keyboard</span> for anything
          </div>
        ) : (
          results.map((item, i) => (
            <button
              key={i}
              type="button"
              onClick={() => insertRef.current(item.latex)}
              onMouseEnter={() => setSelected(i)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors border-b border-[#F9FAFB] last:border-none ${
                i === selected ? "bg-[#F0F7FF]" : "hover:bg-[#FAFAFA]"
              }`}
            >
              {/* Rendered preview */}
              <span
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#F9FAFB] border border-[#EAECF0] shrink-0 overflow-hidden text-[12px]"
                dangerouslySetInnerHTML={{ __html: renderDisplay(item.latex) }}
              />
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-[12px] font-semibold text-[#344054] truncate">{item.label}</span>
                <span className="text-[10px] text-[#98A2B3] truncate font-mono">{item.display}</span>
              </div>
              {i === selected && (
                <kbd className="shrink-0 text-[9px] bg-[#F2F4F7] text-[#667085] px-1.5 py-0.5 rounded border border-[#E4E7EC]">
                  ↵
                </kbd>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(content, document.body) : null;
}
