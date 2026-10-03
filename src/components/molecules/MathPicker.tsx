"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import katex from "katex";
import { MathLiveField } from "./MathLiveField";
import { ToolbarTooltipButton } from "@/components/ui/toolbar-tooltip-button";

// ─── Types ────────────────────────────────────────────────────────────────────

type Sym        = { label: string; latex: string; block?: boolean; vars?: string[] };
type SectionRow = Sym | { type: "header"; label: string };

// ─── Symbol sections ──────────────────────────────────────────────────────────

const SECTIONS: Record<string, SectionRow[]> = {
  Math: [
    { type: "header", label: "Templates" },
    { label: "a/b",    latex: "\\frac{VAR_1}{VAR_2}",        vars: ["Numerator",  "Denominator"] },
    { label: "√x",     latex: "\\sqrt{VAR_1}",               vars: ["Value"] },
    { label: "ⁿ√x",    latex: "\\sqrt[VAR_1]{VAR_2}",        vars: ["n", "Value"] },
    { label: "xⁿ",     latex: "VAR_1^{VAR_2}",               vars: ["Base", "Exponent"] },
    { label: "xₙ",     latex: "VAR_1_{VAR_2}",               vars: ["Variable", "Subscript"] },
    { label: "nCr",    latex: "\\binom{VAR_1}{VAR_2}",        vars: ["n", "r"] },
    { label: "|x|",    latex: "|VAR_1|",                      vars: ["Value"] },
    { label: "‖v‖",    latex: "\\|VAR_1\\|",                  vars: ["Vector"] },
    { type: "header", label: "Greek" },
    { label: "α",  latex: "\\alpha" },  { label: "β",  latex: "\\beta" },
    { label: "γ",  latex: "\\gamma" },  { label: "Γ",  latex: "\\Gamma" },
    { label: "δ",  latex: "\\delta" },  { label: "Δ",  latex: "\\Delta" },
    { label: "ε",  latex: "\\epsilon" },{ label: "η",  latex: "\\eta" },
    { label: "θ",  latex: "\\theta" },  { label: "Θ",  latex: "\\Theta" },
    { label: "λ",  latex: "\\lambda" }, { label: "Λ",  latex: "\\Lambda" },
    { label: "μ",  latex: "\\mu" },     { label: "ν",  latex: "\\nu" },
    { label: "π",  latex: "\\pi" },     { label: "Π",  latex: "\\Pi" },
    { label: "ρ",  latex: "\\rho" },    { label: "σ",  latex: "\\sigma" },
    { label: "Σ",  latex: "\\Sigma" },  { label: "τ",  latex: "\\tau" },
    { label: "φ",  latex: "\\phi" },    { label: "Φ",  latex: "\\Phi" },
    { label: "ψ",  latex: "\\psi" },    { label: "Ψ",  latex: "\\Psi" },
    { label: "ω",  latex: "\\omega" },  { label: "Ω",  latex: "\\Omega" },
    { label: "ξ",  latex: "\\xi" },     { label: "χ",  latex: "\\chi" },
    { type: "header", label: "Relations & Operators" },
    { label: "≤",  latex: "\\leq" },    { label: "≥",  latex: "\\geq" },
    { label: "≠",  latex: "\\neq" },    { label: "≈",  latex: "\\approx" },
    { label: "≡",  latex: "\\equiv" },  { label: "∝",  latex: "\\propto" },
    { label: "~",  latex: "\\sim" },    { label: "∞",  latex: "\\infty" },
    { label: "±",  latex: "\\pm" },     { label: "∓",  latex: "\\mp" },
    { label: "×",  latex: "\\times" },  { label: "÷",  latex: "\\div" },
    { label: "⋅",  latex: "\\cdot" },   { label: "∘",  latex: "\\circ" },
    { type: "header", label: "Sets & Logic" },
    { label: "∈",  latex: "\\in" },     { label: "∉",  latex: "\\notin" },
    { label: "⊂",  latex: "\\subset" }, { label: "⊆",  latex: "\\subseteq" },
    { label: "∪",  latex: "\\cup" },    { label: "∩",  latex: "\\cap" },
    { label: "∅",  latex: "\\emptyset" },{ label: "∀", latex: "\\forall" },
    { label: "∃",  latex: "\\exists" }, { label: "¬",  latex: "\\neg" },
    { label: "∧",  latex: "\\wedge" },  { label: "∨",  latex: "\\vee" },
    { label: "ℝ",  latex: "\\mathbb{R}" },{ label: "ℤ",latex: "\\mathbb{Z}" },
    { label: "ℕ",  latex: "\\mathbb{N}" },{ label: "ℂ",latex: "\\mathbb{C}" },
    { label: "ℚ",  latex: "\\mathbb{Q}" },
    { type: "header", label: "Calculus" },
    { label: "∫",      latex: "\\int" },
    { label: "∫ᵃᵇ",    latex: "\\int_{a}^{b}" },
    { label: "∬",      latex: "\\iint" },
    { label: "∮",      latex: "\\oint" },
    { label: "Σᵢ",     latex: "\\sum_{i=1}^{n}" },
    { label: "Πᵢ",     latex: "\\prod_{i=1}^{n}" },
    { label: "lim",    latex: "\\lim_{x \\to \\infty}" },
    { label: "d/dx",   latex: "\\frac{d}{dx}" },
    { label: "∂/∂x",   latex: "\\frac{\\partial}{\\partial x}" },
    { label: "∇",      latex: "\\nabla" },
    { label: "d²/dx²", latex: "\\frac{d^2}{dx^2}" },
    { type: "header", label: "Trig" },
    { label: "sin",    latex: "\\sin" },  { label: "cos",    latex: "\\cos" },
    { label: "tan",    latex: "\\tan" },  { label: "cot",    latex: "\\cot" },
    { label: "sec",    latex: "\\sec" },  { label: "csc",    latex: "\\csc" },
    { label: "sin⁻¹",  latex: "\\arcsin" },{ label: "cos⁻¹", latex: "\\arccos" },
    { label: "tan⁻¹",  latex: "\\arctan" },
    { label: "sinh",   latex: "\\sinh" }, { label: "cosh",   latex: "\\cosh" },
    { label: "tanh",   latex: "\\tanh" },
    { type: "header", label: "Misc" },
    { label: "log",    latex: "\\log" },  { label: "ln",     latex: "\\ln" },
    { label: "exp",    latex: "\\exp" },  { label: "max",    latex: "\\max" },
    { label: "min",    latex: "\\min" },
    { label: "⌊x⌋",   latex: "\\lfloor x \\rfloor" },
    { label: "⌈x⌉",   latex: "\\lceil x \\rceil" },
    { label: "→",      latex: "\\to" },   { label: "⟹",     latex: "\\Rightarrow" },
    { label: "⟺",     latex: "\\Leftrightarrow" },
    { label: "…",      latex: "\\ldots" },{ label: "⋮",      latex: "\\vdots" },
    { label: "⋱",      latex: "\\ddots" },
  ],

  Physics: [
    { type: "header", label: "Templates" },
    { label: "F=ma",    latex: "VAR_1 = VAR_2 \\times VAR_3",              vars: ["Force (F)", "Mass (m)", "Acceleration (a)"] },
    { label: "v=u+at",  latex: "VAR_1 = VAR_2 + VAR_3 t",                 vars: ["v", "u", "a"] },
    { label: "s=ut+½at²", latex: "VAR_1 = VAR_2 t + \\frac{1}{2}VAR_3 t^2", vars: ["s", "u", "a"] },
    { label: "v²=u²+2as", latex: "VAR_1^2 = VAR_2^2 + 2VAR_3 VAR_4",     vars: ["v", "u", "a", "s"] },
    { type: "header", label: "Derivatives / Notation" },
    { label: "dx/dt",   latex: "\\frac{dx}{dt}" },
    { label: "d²x/dt²", latex: "\\frac{d^2x}{dt^2}" },
    { label: "ẋ",       latex: "\\dot{x}" }, { label: "ẍ",  latex: "\\ddot{x}" },
    { label: "∂u/∂t",   latex: "\\frac{\\partial u}{\\partial t}" },
    { type: "header", label: "Vectors" },
    { label: "v⃗",       latex: "\\vec{v}" },  { label: "n̂",  latex: "\\hat{n}" },
    { label: "F",        latex: "\\mathbf{F}" },{ label: "|F|", latex: "|\\vec{F}|" },
    { label: "A·B",      latex: "\\vec{A} \\cdot \\vec{B}" },
    { label: "A×B",      latex: "\\vec{A} \\times \\vec{B}" },
    { type: "header", label: "Constants" },
    { label: "ℏ",  latex: "\\hbar" },    { label: "ε₀", latex: "\\varepsilon_0" },
    { label: "μ₀", latex: "\\mu_0" },    { label: "kB", latex: "k_B" },
    { label: "NA", latex: "N_A" },        { label: "c",  latex: "c" },
    { type: "header", label: "Famous Equations" },
    { label: "E=mc²",   latex: "E = mc^2" },
    { label: "KE=½mv²", latex: "KE = \\frac{1}{2}mv^2" },
    { label: "p=mv",    latex: "p = mv" },
    { label: "W=Fd",    latex: "W = Fd\\cos\\theta" },
    { label: "P=W/t",   latex: "P = \\frac{W}{t}" },
    { label: "E=hf",    latex: "E = hf" },
    { label: "λ=h/p",   latex: "\\lambda = \\frac{h}{p}" },
    { label: "V=IR",    latex: "V = IR" },
    { label: "P=IV",    latex: "P = IV" },
    { label: "F=kq₁q₂/r²", latex: "F = \\frac{kq_1q_2}{r^2}" },
    { label: "PV=nRT",  latex: "PV = nRT" },
    { type: "header", label: "Change Notation" },
    { label: "Δx",  latex: "\\Delta x" }, { label: "Δt",  latex: "\\Delta t" },
    { label: "ΔE",  latex: "\\Delta E" }, { label: "Δv",  latex: "\\Delta v" },
    { label: "Δp",  latex: "\\Delta p" }, { label: "ΔKE", latex: "\\Delta KE" },
  ],

  Chemistry: [
    { type: "header", label: "Templates" },
    { label: "pH=−log",   latex: "\\text{pH} = -\\log[VAR_1]",   vars: ["Ion (e.g. H⁺)"] },
    { label: "n=m/M",     latex: "n = \\frac{VAR_1}{VAR_2}",      vars: ["mass (m)", "Molar mass (M)"] },
    { label: "c=n/V",     latex: "c = \\frac{VAR_1}{VAR_2}",      vars: ["moles (n)", "Volume (V)"] },
    { label: "% yield",   latex: "\\% \\text{yield} = \\frac{VAR_1}{VAR_2} \\times 100", vars: ["Actual yield", "Theoretical yield"] },
    { type: "header", label: "Labeled Reaction Arrows" },
    {
      label: "→[above]",
      latex: "\\xrightarrow{\\text{VAR_1}}",
      vars: ["Condition (e.g. heat, light, catalyst)"],
    },
    {
      label: "→[a/b]",
      latex: "\\xrightarrow[\\text{VAR_2}]{\\text{VAR_1}}",
      vars: ["Above (e.g. light)", "Below (e.g. chlorophyll)"],
    },
    {
      label: "←[a/b]",
      latex: "\\xleftarrow[\\text{VAR_2}]{\\text{VAR_1}}",
      vars: ["Above", "Below"],
    },
    {
      label: "⇌[a/b]",
      latex: "\\underset{\\text{VAR_2}}{\\overset{\\text{VAR_1}}{\\rightleftharpoons}}",
      vars: ["Forward condition (above)", "Reverse condition (below)"],
    },
    { type: "header", label: "Reaction Arrows" },
    { label: "→",   latex: "\\rightarrow" },   { label: "←",   latex: "\\leftarrow" },
    { label: "⇌",   latex: "\\rightleftharpoons" },
    { label: "↔",   latex: "\\leftrightarrow" },{ label: "⟶",  latex: "\\longrightarrow" },
    { type: "header", label: "Charge / Subscripts" },
    { label: "⁺",  latex: "^{+}" },  { label: "⁻",   latex: "^{-}" },
    { label: "²⁺", latex: "^{2+}" }, { label: "²⁻",  latex: "^{2-}" },
    { label: "³⁺", latex: "^{3+}" }, { label: "³⁻",  latex: "^{3-}" },
    { label: "₂",  latex: "_{2}" },  { label: "₃",   latex: "_{3}" },
    { label: "₄",  latex: "_{4}" },  { label: "₆",   latex: "_{6}" },
    { type: "header", label: "Common Compounds" },
    { label: "H₂O",    latex: "\\text{H}_2\\text{O}" },
    { label: "CO₂",    latex: "\\text{CO}_2" },
    { label: "O₂",     latex: "\\text{O}_2" },
    { label: "N₂",     latex: "\\text{N}_2" },
    { label: "NaCl",   latex: "\\text{NaCl}" },
    { label: "H₂SO₄",  latex: "\\text{H}_2\\text{SO}_4" },
    { label: "HCl",    latex: "\\text{HCl}" },
    { label: "NaOH",   latex: "\\text{NaOH}" },
    { label: "NH₃",    latex: "\\text{NH}_3" },
    { label: "CH₄",    latex: "\\text{CH}_4" },
    { label: "HNO₃",   latex: "\\text{HNO}_3" },
    { label: "H₂O₂",   latex: "\\text{H}_2\\text{O}_2" },
    { type: "header", label: "Thermodynamics" },
    { label: "ΔH",   latex: "\\Delta H" }, { label: "ΔG",  latex: "\\Delta G" },
    { label: "ΔS",   latex: "\\Delta S" }, { label: "Keq", latex: "K_{eq}" },
    { label: "Ksp",  latex: "K_{sp}" },    { label: "Ka",  latex: "K_a" },
    { label: "Kb",   latex: "K_b" },       { label: "Kw",  latex: "K_w" },
    { label: "Kp",   latex: "K_p" },       { label: "Kc",  latex: "K_c" },
    { type: "header", label: "Orbital / Electron" },
    { label: "1s²", latex: "1s^2" },   { label: "2s²", latex: "2s^2" },
    { label: "2p⁶", latex: "2p^6" },   { label: "3d¹⁰", latex: "3d^{10}" },
    { label: "[A]", latex: "[\\text{A}]" },
    { label: "mol/L", latex: "\\text{mol/L}" },
    { label: "λ",   latex: "\\lambda" },{ label: "ν",   latex: "\\nu" },
  ],

  Biology: [
    { type: "header", label: "Genetics" },
    {
      label: "Cross ×",
      latex: "VAR_1 \\times VAR_2",
      vars: ["Parent 1 genotype (e.g. Aa)", "Parent 2 genotype (e.g. Bb)"],
    },
    { label: "P₁",     latex: "\\text{P}_1" },
    { label: "F₁",     latex: "\\text{F}_1" },
    { label: "F₂",     latex: "\\text{F}_2" },
    { label: "AA",     latex: "\\text{A}\\text{A}" },
    { label: "Aa",     latex: "\\text{A}\\text{a}" },
    { label: "aa",     latex: "\\text{a}\\text{a}" },
    { label: "3:1",    latex: "3:1" },
    { label: "1:2:1",  latex: "1:2:1" },
    { label: "9:3:3:1",latex: "9:3:3:1" },
    {
      label: "H-W",
      latex: "p^2 + 2pq + q^2 = 1",
    },
    { type: "header", label: "DNA / RNA" },
    { label: "A-T",    latex: "\\text{A}{-}\\text{T}" },
    { label: "G-C",    latex: "\\text{G}{-}\\text{C}" },
    { label: "A-U",    latex: "\\text{A}{-}\\text{U}" },
    {
      label: "DNA→RNA",
      latex: "\\text{DNA} \\xrightarrow{\\text{transcription}} \\text{mRNA}",
    },
    {
      label: "RNA→P",
      latex: "\\text{mRNA} \\xrightarrow{\\text{translation}} \\text{Protein}",
    },
    { label: "5'→3'",  latex: "5' \\rightarrow 3'" },
    { type: "header", label: "Cell Cycle" },
    { label: "G₁", latex: "\\text{G}_1" }, { label: "S",  latex: "\\text{S}" },
    { label: "G₂", latex: "\\text{G}_2" }, { label: "M",  latex: "\\text{M}" },
    { label: "G₀", latex: "\\text{G}_0" },
    { type: "header", label: "Biochemistry" },
    { label: "ATP",    latex: "\\text{ATP}" },  { label: "ADP",  latex: "\\text{ADP}" },
    { label: "NADH",   latex: "\\text{NADH}" }, { label: "NADPH",latex: "\\text{NADPH}" },
    { label: "FADH₂",  latex: "\\text{FADH}_2" },
    { label: "ATP→ADP", latex: "\\text{ATP} \\rightarrow \\text{ADP} + P_i" },
    {
      label: "Glucose",
      latex: "\\text{C}_6\\text{H}_{12}\\text{O}_6",
    },
    {
      label: "Photosyn.",
      latex: "6\\text{CO}_2 + 6\\text{H}_2\\text{O} \\xrightarrow[\\text{chlorophyll}]{\\text{light}} \\text{C}_6\\text{H}_{12}\\text{O}_6 + 6\\text{O}_2",
    },
    {
      label: "Respir.",
      latex: "\\text{C}_6\\text{H}_{12}\\text{O}_6 + 6\\text{O}_2 \\rightarrow 6\\text{CO}_2 + 6\\text{H}_2\\text{O} + \\text{ATP}",
    },
    {
      label: "E-kinetics",
      latex: "\\text{E} + \\text{S} \\rightleftharpoons \\text{ES} \\rightarrow \\text{E} + \\text{P}",
    },
    { label: "Km",     latex: "K_m" },          { label: "Vmax", latex: "V_{\\max}" },
    { type: "header", label: "Ecology" },
    {
      label: "Logistic",
      latex: "\\frac{dN}{dt} = rN\\!\\left(1-\\frac{N}{K}\\right)",
    },
    { label: "N",      latex: "N" }, { label: "r",    latex: "r" }, { label: "K",   latex: "K" },
    { type: "header", label: "Microscopy" },
    {
      label: "Magn.",
      latex: "\\text{Magnification} = \\frac{VAR_1}{VAR_2}",
      vars: ["Image size", "Actual size"],
    },
    { label: "×100",   latex: "\\times 100" }, { label: "×400",  latex: "\\times 400" },
    { label: "×1000",  latex: "\\times 1000" },
  ],

  "Stats & Geo": [
    { type: "header", label: "Statistics" },
    { label: "x̄",       latex: "\\bar{x}" },
    { label: "μ",       latex: "\\mu" },        { label: "σ",    latex: "\\sigma" },
    { label: "σ²",      latex: "\\sigma^2" },   { label: "s²",   latex: "s^2" },
    { label: "r",       latex: "r" },
    { label: "P(A)",    latex: "P(A)" },         { label: "P(A|B)",latex: "P(A|B)" },
    { label: "Σx",      latex: "\\sum x" },      { label: "x̄=Σx/n",latex: "\\bar{x} = \\frac{\\sum x}{n}" },
    {
      label: "z-score",
      latex: "z = \\frac{VAR_1 - \\mu}{\\sigma}",
      vars: ["x (value)", "μ (mean)", "σ (std dev)"],
    },
    {
      label: "Norm Dist",
      latex: "X \\sim N(\\mu, \\sigma^2)",
    },
    {
      label: "CI",
      latex: "\\bar{x} \\pm z^* \\frac{\\sigma}{\\sqrt{n}}",
    },
    { label: "n!",      latex: "n!" },
    { label: "nPr",     latex: "{}^{n}P_{r}" },
    { label: "nCr",     latex: "\\binom{n}{r}" },
    { label: "E(X)",    latex: "E(X)" },          { label: "Var(X)",latex: "\\text{Var}(X)" },
    { label: "p-val",   latex: "p\\text{-value}" },
    { type: "header", label: "Geometry" },
    { label: "∠",       latex: "\\angle" },
    { label: "∥",       latex: "\\parallel" },   { label: "⊥",   latex: "\\perp" },
    { label: "≅",       latex: "\\cong" },        { label: "~",   latex: "\\sim" },
    { label: "△ABC",    latex: "\\triangle ABC" },
    { label: "°",       latex: "^\\circ" },
    { label: "arc",     latex: "\\overset{\\frown}{AB}" },
    {
      label: "Area △",
      latex: "A = \\frac{1}{2}VAR_1 VAR_2",
      vars: ["base", "height"],
    },
    {
      label: "Area ○",
      latex: "A = \\pi VAR_1^2",
      vars: ["radius r"],
    },
    {
      label: "Pythag.",
      latex: "VAR_1^2 + VAR_2^2 = VAR_3^2",
      vars: ["a", "b", "c (hypotenuse)"],
    },
    {
      label: "Sine rule",
      latex: "\\frac{a}{\\sin A} = \\frac{b}{\\sin B} = \\frac{c}{\\sin C}",
    },
    {
      label: "Cosine",
      latex: "c^2 = a^2 + b^2 - 2ab\\cos C",
    },
    {
      label: "Slope",
      latex: "m = \\frac{VAR_1 - VAR_2}{VAR_3 - VAR_4}",
      vars: ["y₂", "y₁", "x₂", "x₁"],
    },
    { label: "y=mx+c", latex: "y = mx + c" },
    { label: "dist.",   latex: "d = \\sqrt{(x_2-x_1)^2 + (y_2-y_1)^2}" },
  ],
};

type TabKey = keyof typeof SECTIONS;
const ALL_TABS: TabKey[] = Object.keys(SECTIONS) as TabKey[];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderKatex(latex: string, display = false): string {
  if (!latex.trim()) return "";
  try {
    return katex.renderToString(latex, { throwOnError: false, displayMode: display });
  } catch {
    return "";
  }
}

function isSym(row: SectionRow): row is Sym {
  return !("type" in row);
}

// ─── Component ────────────────────────────────────────────────────────────────

interface MathPickerProps {
  onInsertInline: (latex: string) => void;
  onInsertBlock: (latex: string) => void;
}

export function MathPicker({ onInsertInline, onInsertBlock }: MathPickerProps) {
  const [open, setOpen]               = useState(false);
  const [tab, setTab]                 = useState<TabKey>("Math");
  const [search, setSearch]           = useState("");
  const [pendingFormula, setPending]  = useState<{ sym: Sym; values: string[]; mathModes: boolean[] } | null>(null);
  const [hoveredLatex, setHovered] = useState<string | null>(null);
  const [popupStyle, setPopupStyle]   = useState<React.CSSProperties>({});

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef   = useRef<HTMLDivElement>(null);

  const recalcPos = useCallback(() => {
    if (!triggerRef.current) return;
    const rect  = triggerRef.current.getBoundingClientRect();
    const vpW   = window.innerWidth;
    const popW  = 380;
    let left    = rect.left;
    if (left + popW > vpW - 8) left = vpW - popW - 8;
    setPopupStyle({ position: "fixed", top: rect.bottom + 6, left, zIndex: 9999, width: popW });
  }, []);

  const handleOpen = () => {
    const next = !open;
    if (next) { recalcPos(); setPending(null); setSearch(""); }
    setOpen(next);
  };

  // Click-outside using both refs
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || popupRef.current?.contains(t)) return;
      setOpen(false); setPending(null); setSearch("");
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Reposition on scroll / resize so it tracks the button
  useEffect(() => {
    if (!open) return;
    window.addEventListener("scroll", recalcPos, true);
    window.addEventListener("resize", recalcPos);
    return () => {
      window.removeEventListener("scroll", recalcPos, true);
      window.removeEventListener("resize", recalcPos);
    };
  }, [open, recalcPos]);

  // ─── Search ────────────────────────────────────────────────────────────────

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q || tab === "Custom") return null;
    const results: (Sym & { sectionKey: string })[] = [];
    for (const [key, rows] of Object.entries(SECTIONS)) {
      for (const row of rows) {
        if (!isSym(row)) continue;
        if (row.label.toLowerCase().includes(q) || row.latex.toLowerCase().includes(q)) {
          results.push({ ...row, sectionKey: key });
        }
      }
    }
    return results;
  }, [search, tab]);

  // ─── Actions ───────────────────────────────────────────────────────────────

  const insertDirect = (sym: Sym) => {
    if (sym.block) {
      onInsertBlock(sym.latex);
    } else {
      onInsertInline(sym.latex);
    }
    setOpen(false); setSearch("");
  };

  const openTemplate = (sym: Sym) => {
    setPending({ sym, values: sym.vars!.map(() => ""), mathModes: sym.vars!.map(() => false) });
    setSearch("");
  };

  const handleSymClick = (sym: Sym) => {
    if (sym.vars && sym.vars.length > 0) openTemplate(sym);
    else insertDirect(sym);
  };

  // Returns the replacement for VAR_N, wrapping plain-text input in \text{} so
  // spaces survive math mode and % doesn't start a LaTeX comment.
  const resolveVar = useCallback(
    (sym: Sym, i: number, val: string, isMath: boolean): string => {
      const filled = val.trim() || `\\square`;
      // Arrow templates already embed \text{VAR_N} — don't double-wrap.
      if (sym.latex.includes(`\\text{VAR_${i + 1}}`)) return filled;
      return isMath ? filled : `\\text{${filled}}`;
    },
    [],
  );

  const submitTemplate = () => {
    if (!pendingFormula) return;
    let latex = pendingFormula.sym.latex;
    pendingFormula.values.forEach((val, i) => {
      const replacement = resolveVar(pendingFormula.sym, i, val, pendingFormula.mathModes[i]);
      latex = latex.replace(new RegExp(`VAR_${i + 1}`, "g"), replacement);
    });
    if (pendingFormula.sym.block) {
      onInsertBlock(latex);
    } else {
      onInsertInline(latex);
    }
    setPending(null); setOpen(false);
  };

  const hoverPreview = hoveredLatex ? renderKatex(hoveredLatex) : null;

  // ─── Render helpers ────────────────────────────────────────────────────────

  const renderGrid = (rows: SectionRow[]) => (
    <div className="grid grid-cols-6 gap-1">
      {rows.map((row, i) => {
        if (!isSym(row))
          return (
            <div key={`h-${i}`} className="col-span-6 text-[9px] font-semibold text-[#98A2B3] uppercase tracking-widest px-1 pt-2.5 pb-1 border-t border-[#F2F4F7] mt-1 first:border-none first:mt-0 first:pt-0">
              {row.label}
            </div>
          );

        const isTemplate = !!row.vars?.length;
        return (
          <button
            key={`${i}-${row.label}`}
            type="button"
            title={isTemplate ? `Fill in: ${row.vars!.join(", ")}` : row.latex}
            onClick={() => handleSymClick(row)}
            onMouseEnter={() => setHovered(isTemplate ? null : row.latex)}
            onMouseLeave={() => setHovered(null)}
            className={`h-9 flex items-center justify-center rounded-[6px] text-[12px] font-medium leading-none transition-all overflow-hidden px-0.5 hover:scale-105 active:scale-95 ${
              isTemplate
                ? "col-span-2 bg-[#EFF8FF] text-[#007FFF] hover:bg-[#DBEDFF] text-[10px]"
                : "bg-[#F9FAFB] text-[#344054] hover:bg-[#DBEDFF] hover:text-[#007FFF]"
            }`}
          >
            {row.label}
          </button>
        );
      })}
    </div>
  );

  // ─── JSX ───────────────────────────────────────────────────────────────────

  const popupEl = open ? (
    <div
      ref={popupRef}
      style={{
        ...popupStyle,
        boxShadow: "0 20px 40px -8px rgba(16,24,40,0.14), 0 0 0 1px rgba(0,0,0,0.04)",
        maxHeight: "480px",
      }}
      className="rounded-[12px] border border-[#EAECF0] bg-white flex flex-col"
    >
          {/* ── Tab bar ─────────────────────────────────────────────────── */}
          <div className="flex border-b border-[#EAECF0] px-2 pt-2 gap-0.5 shrink-0 flex-wrap">
            {ALL_TABS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setTab(t); setPending(null); setSearch(""); }}
                className={`px-2.5 py-1.5 text-[11px] font-semibold rounded-t-[6px] transition-all whitespace-nowrap ${
                  tab === t
                    ? "bg-white text-[#007FFF] border border-b-white border-[#EAECF0] -mb-px shadow-sm"
                    : "text-[#667085] hover:text-[#344054] hover:bg-[#F9FAFB]"
                }`}
              >
                {t}
              </button>
            ))}
            <div className="ml-auto self-center text-[9px] text-[#C0C8D2] pr-1 hidden sm:block">click to insert</div>
          </div>

          {/* ── Search bar ────────────────────────────────────────────────── */}
          {!pendingFormula && (
            <div className="px-3 pt-2.5 pb-1 shrink-0">
              <div className="relative">
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#98A2B3]" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                <input
                  type="text"
                  placeholder="Search symbols…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-7 pr-3 py-1.5 rounded-lg border border-[#E4E7EC] text-[12px] text-[#344054] placeholder-[#98A2B3] outline-none focus:border-[#007FFF] bg-[#FAFAFA]"
                />
                {search && (
                  <button type="button" onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#98A2B3] hover:text-[#344054]">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── Template fill-in ──────────────────────────────────────────── */}
          {pendingFormula && (
            <div className="flex flex-col gap-3 p-3 overflow-y-auto flex-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPending(null)}
                  className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-[#667085] hover:bg-[#F2F4F7] transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-[#344054]">{pendingFormula.sym.label}</span>
                  <span className="text-[10px] text-[#98A2B3] truncate font-mono">{pendingFormula.sym.latex}</span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {pendingFormula.sym.vars!.map((varName, i) => {
                  const isMathMode = pendingFormula.mathModes[i];
                  return (
                    <div key={i} className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-semibold text-[#344054]">
                          <span className="inline-block w-4 h-4 rounded bg-[#007FFF] text-white text-[9px] font-bold text-center leading-4 mr-1.5">{i + 1}</span>
                          {varName}
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const next = [...pendingFormula.mathModes];
                            next[i] = !next[i];
                            setPending((p) => p ? { ...p, mathModes: next } : p);
                          }}
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md transition-colors ${
                            isMathMode
                              ? "bg-[#007FFF] text-white"
                              : "bg-[#F2F4F7] text-[#667085] hover:bg-[#E4E7EC]"
                          }`}
                        >
                          {isMathMode ? "fx ✓" : "fx"}
                        </button>
                      </div>

                      {isMathMode ? (
                        <div className="rounded-lg border border-[#D0D5DD] overflow-hidden">
                          <MathLiveField
                            onChange={(v) => {
                              const vals = [...pendingFormula.values];
                              vals[i] = v;
                              setPending((p) => p ? { ...p, values: vals } : p);
                            }}
                          />
                        </div>
                      ) : (
                        <input
                          autoFocus={i === 0 && !isMathMode}
                          type="text"
                          placeholder={`Enter ${varName.toLowerCase()}…`}
                          value={pendingFormula.values[i]}
                          onChange={(e) => {
                            const vals = [...pendingFormula.values];
                            vals[i] = e.target.value;
                            setPending((p) => p ? { ...p, values: vals } : p);
                          }}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submitTemplate(); } }}
                          className="w-full rounded-lg border border-[#D0D5DD] px-3 py-2 text-sm text-[#344054] outline-none focus:border-[#007FFF] focus:ring-2 focus:ring-[#007FFF20] transition-all"
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Template preview */}
              {(() => {
                let preview = pendingFormula.sym.latex;
                pendingFormula.values.forEach((val, i) => {
                  const replacement = resolveVar(pendingFormula.sym, i, val, pendingFormula.mathModes[i]);
                  preview = preview.replace(new RegExp(`VAR_${i + 1}`, "g"), replacement);
                });
                const html = renderKatex(preview, false);
                return html ? (
                  <div className="rounded-lg bg-[#F0F7FF] border border-[#DBEDFF] px-3 py-2 flex items-center gap-2">
                    <span className="text-[9px] font-semibold text-[#007FFF] uppercase tracking-wide shrink-0">Preview</span>
                    <span dangerouslySetInnerHTML={{ __html: html }} className="text-[#101828] text-[15px]" />
                  </div>
                ) : null;
              })()}

              <button
                type="button"
                onClick={submitTemplate}
                className="w-full rounded-lg bg-[#007FFF] text-white text-xs font-bold py-2.5 hover:bg-[#0066CC] active:bg-[#005AB5] transition-colors"
              >
                Insert Formula
              </button>
            </div>
          )}

          {/* ── Symbol grid ───────────────────────────────────────────────── */}
          {!pendingFormula && (
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="overflow-y-auto p-2.5 flex-1">
                {searchResults ? (
                  searchResults.length === 0 ? (
                    <div className="text-center py-6 text-xs text-[#98A2B3]">No symbols found for &quot;{search}&quot;</div>
                  ) : (
                    <div className="grid grid-cols-6 gap-1">
                      {searchResults.map((sym, i) => (
                        <button
                          key={i}
                          type="button"
                          title={sym.sectionKey + " · " + sym.latex}
                          onClick={() => handleSymClick(sym)}
                          onMouseEnter={() => setHovered(sym.vars ? null : sym.latex)}
                          onMouseLeave={() => setHovered(null)}
                          className={`h-9 flex items-center justify-center rounded-[6px] text-[12px] font-medium leading-none transition-all hover:scale-105 active:scale-95 px-0.5 ${
                            sym.vars
                              ? "col-span-2 bg-[#EFF8FF] text-[#007FFF] hover:bg-[#DBEDFF] text-[10px]"
                              : "bg-[#F9FAFB] text-[#344054] hover:bg-[#DBEDFF] hover:text-[#007FFF]"
                          }`}
                        >
                          {sym.label}
                        </button>
                      ))}
                    </div>
                  )
                ) : (
                  renderGrid(SECTIONS[tab as keyof typeof SECTIONS] ?? [])
                )}
              </div>

              {/* Hover preview bar */}
              <div className="border-t border-[#F0F2F5] px-3 py-2 shrink-0 flex items-center gap-2 min-h-[40px] bg-[#FAFAFA]">
                {hoverPreview ? (
                  <>
                    <span className="text-[9px] font-semibold text-[#98A2B3] uppercase tracking-wide shrink-0">Preview</span>
                    <span dangerouslySetInnerHTML={{ __html: hoverPreview }} className="text-[#101828] text-[14px] overflow-hidden" />
                  </>
                ) : (
                  <span className="text-[10px] text-[#C0C8D2]">
                    Hover to preview · type <code className="bg-white px-0.5 rounded border border-[#EAECF0]">$…$</code> inline · <code className="bg-white px-0.5 rounded border border-[#EAECF0]">$$…$$</code> block · <span className="text-[#007FFF]">✏️</span> for custom
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
  ) : null;

  return (
    <>
      <ToolbarTooltipButton
        ref={triggerRef}
        tooltip="Insert math / science symbol"
        active={open}
        onClick={handleOpen}
        className={`px-2 font-mono font-bold tracking-tight ${
          open ? "bg-[#007FFF] text-white shadow-[0_0_0_3px_#DBEDFF]" : "text-[#98A2B3] hover:text-[#007FFF] hover:bg-[#F0F7FF]"
        }`}
      >
        fx
      </ToolbarTooltipButton>
      {open && popupEl && typeof document !== "undefined" && createPortal(popupEl, document.body)}
    </>
  );
}
