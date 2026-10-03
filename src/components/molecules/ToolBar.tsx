"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Editor } from "@tiptap/react";
import { Icon } from "@iconify/react";
import { MathPicker } from "./MathPicker";
import { MathLiveField } from "./MathLiveField";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
];

const CHAT_BUTTONS = [
  "text-bold",
  "text-italic",
  "text-strikethrough",
  "left-to-right-list-star",
  "left-to-right-list-number",
  "link-01",
];

type ToolBarButton = {
  svg?: string;
  label?: string;
  title?: string;
  action: () => void;
  isActive: () => boolean;
  canRun: () => boolean;
};

// ─── Floating MathLive keyboard panel ─────────────────────────────────────────

function MathKeyboardButton({ editor }: { editor: Editor }) {
  const [open,   setOpen]  = useState(false);
  const [latex,  setLatex] = useState("");
  const [style,  setStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef   = useRef<HTMLDivElement>(null);

  const calcPos = useCallback(() => {
    if (!triggerRef.current) return;
    const r  = triggerRef.current.getBoundingClientRect();
    const vpW = window.innerWidth;
    const popW = 380;
    let left  = r.left;
    if (left + popW > vpW - 8) left = vpW - popW - 8;
    setStyle({ position: "fixed", top: r.bottom + 6, left, width: popW, zIndex: 9999 });
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!triggerRef.current?.contains(t) && !panelRef.current?.contains(t)) {
        setOpen(false); setLatex("");
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener("scroll", calcPos, true);
    window.addEventListener("resize", calcPos);
    return () => {
      window.removeEventListener("scroll", calcPos, true);
      window.removeEventListener("resize", calcPos);
    };
  }, [open, calcPos]);

  const insert = (block: boolean) => {
    if (!latex.trim()) return;
    if (block) {
      editor.chain()
        .focus()
        .insertContent(`$$\n${latex}\n$$`)
        .insertContent({ type: "paragraph" })
        .scrollIntoView()
        .run();
    } else {
      editor.chain()
        .focus()
        .insertContent(`$${latex}$`)
        .scrollIntoView()
        .run();
    }
    setOpen(false); setLatex("");
  };

  const panel = open ? (
    <div
      ref={panelRef}
      style={{
        ...style,
        boxShadow: "0 20px 40px -8px rgba(16,24,40,0.14), 0 0 0 1px rgba(0,0,0,0.04)",
        borderRadius: 12, background: "white", border: "1px solid #EAECF0", overflow: "hidden",
      }}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#F0F2F5] bg-[#FAFAFA]">
        <span className="text-[11px] font-semibold text-[#344054]">Visual Math Keyboard</span>
        <span className="text-[10px] text-[#98A2B3]">type · compose · insert</span>
      </div>
      <div className="p-3 flex flex-col gap-3">
        <MathLiveField onChange={setLatex} />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => insert(false)}
            disabled={!latex.trim()}
            className="flex-1 rounded-lg bg-[#007FFF] text-white text-xs font-semibold py-2 hover:bg-[#0066CC] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Insert Inline
          </button>
          <button
            type="button"
            onClick={() => insert(true)}
            disabled={!latex.trim()}
            className="flex-1 rounded-lg border-2 border-[#007FFF] text-[#007FFF] text-xs font-semibold py-2 hover:bg-[#F0F7FF] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Insert Block
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        title="Visual math keyboard — compose any formula visually then insert"
        onClick={() => { const next = !open; if (next) calcPos(); setOpen(next); if (!next) setLatex(""); }}
        className={`flex h-8 min-w-8 px-1.5 items-center justify-center rounded-md transition-all duration-300 text-sm ${
          open ? "bg-[#007FFF] text-white shadow-[0_0_0_3px_#DBEDFF]" : "bg-white text-[#98A2B3] hover:text-[#007FFF] hover:bg-[#F0F7FF]"
        }`}
      >
        ⌨
      </button>
      {typeof document !== "undefined" && panel && createPortal(panel, document.body)}
    </>
  );
}

// ─── Table controls ────────────────────────────────────────────────────────────

// Compact labelled button used for table row/column operations
function TableBtn({
  title,
  label,
  onClick,
  disabled,
  danger,
}: {
  title: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={(e) => { e.preventDefault(); onClick(); }}
      disabled={disabled}
      className={[
        "flex h-7 items-center justify-center rounded-[5px] px-1.5",
        "text-[10px] font-semibold tracking-tight transition-all duration-300",
        "disabled:opacity-30 disabled:cursor-not-allowed",
        danger
          ? "bg-[#FEF3F2] text-[#D42620] hover:bg-[#FEE4E2] disabled:hover:bg-[#FEF3F2]"
          : "bg-[#F9FAFB] text-[#344054] hover:bg-[#EFF4FF] hover:text-[#007FFF] disabled:hover:bg-[#F9FAFB] disabled:hover:text-[#344054]",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

// ─── Main toolbar ──────────────────────────────────────────────────────────────

interface ToolBarProps {
  editor: Editor;
  onImageUpload?: (file: File) => Promise<string | null>;
  variant?: "full" | "chat";
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

const ToolBar = ({
  editor,
  onImageUpload,
  variant = "full",
  isFullscreen,
  onToggleFullscreen,
}: ToolBarProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!editor) return null;

  const inTable =
    editor.isActive("tableCell") || editor.isActive("tableHeader");

  const buttons: ToolBarButton[] = [
    {
      svg: "text-bold",
      action: () => editor.chain().focus().toggleBold().run(),
      isActive: () => editor.isActive("bold"),
      canRun: () => editor.can().chain().focus().toggleBold().run(),
    },
    {
      svg: "text-italic",
      action: () => editor.chain().focus().toggleItalic().run(),
      isActive: () => editor.isActive("italic"),
      canRun: () => editor.can().chain().focus().toggleItalic().run(),
    },
    {
      svg: "text-underline",
      action: () => editor.chain().focus().toggleUnderline().run(),
      isActive: () => editor.isActive("underline"),
      canRun: () => editor.can().chain().focus().toggleUnderline().run(),
    },
    {
      svg: "text-strikethrough",
      action: () => editor.chain().focus().toggleStrike().run(),
      isActive: () => editor.isActive("strike"),
      canRun: () => editor.can().chain().focus().toggleStrike().run(),
    },
    ...[1, 2, 3, 4, 5, 6].map((level) => ({
      svg: `heading-0${level}`,
      action: () =>
        editor
          .chain()
          .focus()
          .toggleHeading({ level: level as 1 | 2 | 3 | 4 | 5 | 6 })
          .run(),
      isActive: () => editor.isActive("heading", { level }),
      canRun: () => true,
    })),
    {
      svg: "left-to-right-list-star",
      action: () => editor.chain().focus().toggleBulletList().run(),
      isActive: () => editor.isActive("bulletList"),
      canRun: () => true,
    },
    {
      svg: "left-to-right-list-number",
      action: () => editor.chain().focus().toggleOrderedList().run(),
      isActive: () => editor.isActive("orderedList"),
      canRun: () => true,
    },
    {
      svg: "quote-up",
      action: () => editor.chain().focus().toggleBlockquote().run(),
      isActive: () => editor.isActive("blockquote"),
      canRun: () => true,
    },
    {
      svg: "code",
      action: () => editor.chain().focus().toggleCodeBlock().run(),
      isActive: () => editor.isActive("codeBlock"),
      canRun: () => true,
    },
    {
      svg: "link-01",
      action: () => {
        if (editor.isActive("link")) {
          editor.chain().focus().unsetLink().run();
        } else {
          const url = prompt("Enter URL");
          if (url) editor.chain().focus().setLink({ href: url }).run();
        }
      },
      isActive: () => editor.isActive("link"),
      canRun: () => !!editor.can().setLink || editor.isActive("link"),
    },
    {
      label: "x₂",
      title: "Subscript",
      action: () => editor.chain().focus().toggleSubscript().run(),
      isActive: () => editor.isActive("subscript"),
      canRun: () => true,
    },
    {
      label: "x²",
      title: "Superscript",
      action: () => editor.chain().focus().toggleSuperscript().run(),
      isActive: () => editor.isActive("superscript"),
      canRun: () => true,
    },
    {
      svg: "undo",
      action: () => editor.chain().focus().undo().run(),
      isActive: () => false,
      canRun: () => editor.can().undo(),
    },
    {
      svg: "redo",
      action: () => editor.chain().focus().redo().run(),
      isActive: () => false,
      canRun: () => editor.can().redo(),
    },
  ];

  const visibleButtons =
    variant === "chat"
      ? buttons.filter((b) => b.svg !== undefined && CHAT_BUTTONS.includes(b.svg))
      : buttons;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onImageUpload) return;
    const url = await onImageUpload(file);
    if (url) editor.chain().focus().setImage({ src: url }).run();
    e.target.value = "";
  };

  return (
    <div className="flex flex-wrap items-center gap-2 px-3.5 py-1.5 border-b border-[#F0F2F5]">
      {visibleButtons.map((button, index) => (
        <button
          key={index}
          type="button"
          title={button.title}
          onClick={(e) => { e.preventDefault(); button.action(); }}
          disabled={!button.canRun()}
          className={`flex h-8 items-center justify-center rounded-md transition-all duration-[.4s] ${
            button.label ? "w-auto px-1.5 text-xs font-bold" : "w-8"
          } ${
            button.isActive()
              ? "bg-[#007fff10] text-[#007fff]"
              : "bg-white text-[#98A2B3] hover:text-[#007FFF] hover:bg-[#F0F7FF]"
          } disabled:opacity-30 disabled:cursor-not-allowed`}
        >
          {button.label ? button.label : <Icon icon={`hugeicons:${button.svg}`} />}
        </button>
      ))}

      {/* Math / Science symbol picker + visual keyboard — full variant only */}
      {variant !== "chat" && (
        <>
          <MathPicker
            onInsertInline={(latex) =>
              editor.chain().focus().insertContent(`$${latex}$`).scrollIntoView().run()
            }
            onInsertBlock={(latex) =>
              editor
                .chain()
                .focus()
                .insertContent(`$$\n${latex}\n$$`)
                .insertContent({ type: "paragraph" })
                .scrollIntoView()
                .run()
            }
          />
          <MathKeyboardButton editor={editor} />
        </>
      )}

      {onImageUpload && (
        <>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); fileInputRef.current?.click(); }}
            className="flex h-8 w-8 items-center justify-center rounded-md transition-all duration-[.4s] bg-white text-[#98A2B3] hover:text-[#007FFF] hover:bg-[#F0F7FF]"
            title="Insert image"
          >
            <Icon icon="hugeicons:image-01" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_TYPES.join(",")}
            className="sr-only"
            onChange={handleFileChange}
          />
        </>
      )}

      {/* Table controls — full variant only */}
      {variant !== "chat" && (
        <>
          {/* Separator */}
          <div className="w-px h-5 bg-[#E4E7EC] self-center" aria-hidden />

          {/* Insert table */}
          <button
            type="button"
            title="Insert table (3×3)"
            onClick={(e) => {
              e.preventDefault();
              editor
                .chain()
                .focus()
                .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                .run();
            }}
            className="flex h-8 w-8 items-center justify-center rounded-md transition-all duration-[.4s] bg-white text-[#98A2B3] hover:text-[#007FFF] hover:bg-[#F0F7FF]"
          >
            <Icon icon="hugeicons:table-01" />
          </button>

          {/* Contextual table row / column / delete controls */}
          {inTable && (
            <>
              <TableBtn
                title="Add row above"
                label="↑ Row"
                onClick={() => editor.chain().focus().addRowBefore().run()}
                disabled={!editor.can().addRowBefore()}
              />
              <TableBtn
                title="Add row below"
                label="↓ Row"
                onClick={() => editor.chain().focus().addRowAfter().run()}
                disabled={!editor.can().addRowAfter()}
              />
              <TableBtn
                title="Delete row"
                label="− Row"
                onClick={() => editor.chain().focus().deleteRow().run()}
                disabled={!editor.can().deleteRow()}
                danger
              />
              <TableBtn
                title="Add column before"
                label="← Col"
                onClick={() => editor.chain().focus().addColumnBefore().run()}
                disabled={!editor.can().addColumnBefore()}
              />
              <TableBtn
                title="Add column after"
                label="Col →"
                onClick={() => editor.chain().focus().addColumnAfter().run()}
                disabled={!editor.can().addColumnAfter()}
              />
              <TableBtn
                title="Delete column"
                label="− Col"
                onClick={() => editor.chain().focus().deleteColumn().run()}
                disabled={!editor.can().deleteColumn()}
                danger
              />
              <TableBtn
                title="Delete table"
                label="✕ Table"
                onClick={() => editor.chain().focus().deleteTable().run()}
                disabled={!editor.can().deleteTable()}
                danger
              />
            </>
          )}
        </>
      )}

      {/* Fullscreen toggle — pushed to the right */}
      {onToggleFullscreen && (
        <button
          type="button"
          title={isFullscreen ? "Exit fullscreen (Esc)" : "Expand to fullscreen"}
          onClick={(e) => { e.preventDefault(); onToggleFullscreen(); }}
          className={`ml-auto flex h-8 w-8 items-center justify-center rounded-md transition-all duration-300 ${
            isFullscreen
              ? "bg-[#007fff10] text-[#007FFF]"
              : "bg-white text-[#98A2B3] hover:text-[#007FFF] hover:bg-[#F0F7FF]"
          }`}
        >
          <Icon icon={isFullscreen ? "hugeicons:minimize-01" : "hugeicons:maximize-01"} />
        </button>
      )}
    </div>
  );
};

export { ToolBar };
