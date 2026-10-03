"use client";

import Blockquote from "@tiptap/extension-blockquote";
import BulletList from "@tiptap/extension-bullet-list";
import CodeBlock from "@tiptap/extension-code-block";
import Heading from "@tiptap/extension-heading";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { Markdown } from "tiptap-markdown";
import OrderedList from "@tiptap/extension-ordered-list";
import { Table } from "@tiptap/extension-table";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableRow } from "@tiptap/extension-table-row";
import { InlineMathMarkdown, BlockMathMarkdown } from "./MathExtensions";
import { SubscriptMarkdown, SuperscriptMarkdown } from "./SubSuperExtensions";
import Underline from "@tiptap/extension-underline";
import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useState, useEffect, forwardRef, FocusEvent, HTMLAttributes } from "react";
import { ToolBar } from "./ToolBar";
import "@/app/tiptap.css";
import { Icon } from "@iconify/react";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
];

export type SyntheticEvent = {
  target: {
    name: string;
    value: string;
  };
};

export interface RichTextProps {
  slim?: boolean;
  image?: {
    allowed: boolean;
    folder: string;
  };
  /** Controls toolbar scope.
   * - `full` (default) — all buttons
   * - `chat` — bold, italic, link, image only
   */
  variant?: "full" | "chat";
  maxHeight?: string;
  minHeight?: string;
}

interface TipTapProps extends Omit<HTMLAttributes<HTMLDivElement>, "onChange"> {
  name?: string;
  value?: string;
  onChange?: (event: { target: { name: string; value: string } }) => void;
  onBlur?: (event: FocusEvent<HTMLDivElement>) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  trigger?: any;
  error?: string;
  readOnly?: boolean;
  richTextProps?: RichTextProps;
  onImageUpload?: (file: File) => Promise<string | null>;
}

const getEditorMarkdown = (editor: Editor): string => {
  return (
    (
      editor.storage as unknown as Record<
        string,
        { getMarkdown?: () => string }
      >
    ).markdown?.getMarkdown?.() ?? ""
  );
};

// GFM pipe table pattern: header row | separator row | data rows
const GFM_TABLE_RE = /^\|[^\n]+\|\n\|[-| :]+\|\n(?:\|[^\n]+\|\n?)*/gm;

/**
 * Canonical storable content: Markdown for all text/math, raw HTML for tables.
 * GFM pipe tables cannot represent multi-paragraph cell content — storing as HTML
 * preserves the exact structure so edits don't corrupt table data.
 * RichText.tsx uses rehypeRaw which renders embedded <table> blocks correctly.
 */
const getEditorContent = (editor: Editor): string => {
  const markdown = getEditorMarkdown(editor);

  // Fast-path: skip DOM work when there are no tables
  let hasTable = false;
  editor.state.doc.descendants((node) => {
    if (hasTable) return false;
    if (node.type.name === "table") { hasTable = true; return false; }
  });
  if (!hasTable) return markdown;

  const html = editor.getHTML();
  const parser = new DOMParser();
  const parsed = parser.parseFromString(html, "text/html");
  const tables = Array.from(parsed.body.querySelectorAll("table"));
  if (!tables.length) return markdown;

  // Clone each table and strip TipTap's transient editor-state classes
  const tableHtmls = tables.map((t) => {
    const clone = t.cloneNode(true) as Element;
    clone.querySelectorAll(".selectedCell").forEach((el) =>
      el.classList.remove("selectedCell"),
    );
    return clone.outerHTML;
  });

  let idx = 0;
  return markdown.replace(GFM_TABLE_RE, () => {
    const tableHtml = tableHtmls[idx++];
    return tableHtml != null ? `\n${tableHtml}\n` : "";
  });
};

// Convert a base64 data URI to a File object
function dataUriToFile(dataUri: string, filename: string): File | null {
  try {
    const [header, base64] = dataUri.split(",");
    const mimeMatch = header.match(/data:([^;]+)/);
    if (!mimeMatch) return null;
    const mime = mimeMatch[1];
    const bytes = atob(base64);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    return new File([arr], filename, { type: mime });
  } catch {
    return null;
  }
}

const TipTap = forwardRef<HTMLDivElement, TipTapProps>(
  (
    {
      name = "rich-text",
      value = undefined,
      onChange,
      onBlur,
      error,
      readOnly = false,
      richTextProps,
      onImageUpload,
      ...rest
    },
    ref,
  ) => {
    const [fullscreen, setFullscreen] = useState(false);
    const imageAllowed = !!richTextProps?.image?.allowed && !!onImageUpload;

    const handleImageFile = (file: File, editorInstance: Editor) => {
      if (!ALLOWED_TYPES.includes(file.type) || !onImageUpload) return false;
      onImageUpload(file).then((url) => {
        if (url) editorInstance.chain().focus().setImage({ src: url }).run();
      });
      return true;
    };

    const stripWordArtifacts = (html: string): string =>
      html
        .replace(/<!--StartFragment-->|<!--EndFragment-->/gi, "")
        .replace(/<\/?o:[^>]*(\/)?>/gi, "")
        .replace(/<\/?w:[^>]*(\/)?>/gi, "")
        .replace(/<!--\[if[^\]]*\]>[\s\S]*?<!\[endif\]-->/gi, "")
        // Strip inline styles containing Word mso-* properties
        .replace(/\s+style="[^"]*mso-[^"]*(?:[^"]*")*/gi, "")
        // Strip Word-specific class attributes (MsoNormal, MsoBodyText, etc.)
        .replace(/\s+class="(?:Mso|mso)[^"]*"/gi, "")
        // Strip lang attributes Word sprinkles everywhere
        .replace(/\s+lang="[^"]*"/gi, "")
        // Normalize &nbsp; to regular space — Word uses it for tab-stop alignment
        .replace(/&nbsp;/g, " ");

    // Handle paste from Word: strip artifacts, extract base64 images, upload
    const handleWordPaste = async (
      html: string,
    ): Promise<string> => {
      const cleaned = stripWordArtifacts(html);
      if (!imageAllowed || !onImageUpload) return cleaned;
      const parser = new DOMParser();
      const doc = parser.parseFromString(cleaned, "text/html");
      const imgs = Array.from(doc.querySelectorAll("img[src^='data:']"));
      await Promise.all(
        imgs.map(async (img, i) => {
          const src = img.getAttribute("src") ?? "";
          const file = dataUriToFile(src, `word-image-${i}.png`);
          if (!file || !ALLOWED_TYPES.includes(file.type)) return;
          const url = await onImageUpload(file);
          if (url) img.setAttribute("src", url);
          else img.remove();
        }),
      );
      return doc.body.innerHTML;
    };

    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          heading: false,
          bulletList: false,
          orderedList: false,
          blockquote: false,
          codeBlock: false,
        }),
        Underline,
        Link,
        Heading.configure({ levels: [1, 2, 3, 4, 5, 6] }),
        BulletList,
        OrderedList,
        Blockquote,
        CodeBlock,
        Image,
        Table.configure({ resizable: false }),
        TableRow,
        TableHeader,
        TableCell,
        // html: true lets the Markdown extension pass raw HTML blocks through
        // markdown-it, so stored <table> HTML round-trips back to table nodes
        Markdown.configure({ html: true }),
        InlineMathMarkdown,
        BlockMathMarkdown,
        SubscriptMarkdown,
        SuperscriptMarkdown,
      ],
      content: value,
      onUpdate: ({ editor }) => {
        const content = getEditorContent(editor);
        onChange?.({ target: { name, value: content } });
      },
      editorProps: {
        attributes: {
          class: `outline-none text-[16px] font-[400] leading-[24px] bg-white p-[1px_14px_10px_14px] rounded-[8px] min-h-[100px] w-full`,
        },
        transformPastedHTML: (html) => stripWordArtifacts(html),
        handleDrop: (_view, event) => {
          if (!imageAllowed || !editor) return false;
          const file = (event as DragEvent).dataTransfer?.files?.[0];
          if (!file || !ALLOWED_TYPES.includes(file.type)) return false;
          event.preventDefault();
          handleImageFile(file, editor);
          return true;
        },
        handlePaste: (_view, event) => {
          // Priority 1: file from clipboard (direct screenshot/image paste)
          const file = event.clipboardData?.files?.[0];
          if (file && ALLOWED_TYPES.includes(file.type) && imageAllowed) {
            event.preventDefault();
            if (editor) handleImageFile(file, editor);
            return true;
          }

          // Priority 2: HTML paste (Word, web) — handle base64 images, tables,
          // and Word-specific HTML (which embeds sub/sup as <sub>/<sup> tags).
          const html = event.clipboardData?.getData("text/html");
          if (html && editor) {
            const hasBase64Images = /src=['"]data:image/.test(html);
            const hasTables = /<table/i.test(html);
            const isWordHtml =
              /xmlns[^>]*microsoft/i.test(html) ||
              /mso-[a-z]/i.test(html) ||
              /<w:/i.test(html);
            if ((hasBase64Images && imageAllowed) || hasTables || isWordHtml) {
              event.preventDefault();
              handleWordPaste(html).then((processed) => {
                editor.commands.insertContent(processed);
              });
              return true;
            }
          }

          return false;
        },
      },
      immediatelyRender: false,
      shouldRerenderOnTransaction: true,
      editable: !readOnly,
    });

    useEffect(() => {
      if (!editor || value === undefined) return;
      // Some JSON encoders escape forward slashes as \/ — unescape so markdown-it
      // doesn't render phantom "/" characters from the escape sequences.
      const normalized = (value ?? "").replace(/\\\//g, "/");
      const curMarkdown = getEditorMarkdown(editor);
      const curContent = getEditorContent(editor);
      // Skip setContent if the current editor state already matches value in either
      // the old Markdown format or the new HTML-embedded format, to avoid resetting
      // cursor position unnecessarily.
      if (curMarkdown === normalized || curContent === normalized) return;
      editor.commands.setContent(normalized, { emitUpdate: false });
    }, [editor, value]);

    useEffect(() => {
      editor?.setEditable(!readOnly);
    }, [editor, readOnly]);

    // Dismiss fullscreen on Escape
    useEffect(() => {
      if (!fullscreen) return;
      const handler = (e: KeyboardEvent) => {
        if (e.key === "Escape") setFullscreen(false);
      };
      document.addEventListener("keydown", handler);
      return () => document.removeEventListener("keydown", handler);
    }, [fullscreen]);

    const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
      onBlur?.(event);
    };

    return (
      <div
        className={[
          "flex w-full flex-col gap-px rounded-lg border transition-all duration-[.4s]",
          fullscreen
            ? "fixed inset-0 z-9999 rounded-none! border-0! bg-white overflow-hidden"
            : "",
          error
            ? "border-[#FDA29B] text-[#F04438]"
            : readOnly
              ? "border-gray-200 bg-gray-50"
              : "border-[#D0D5DD] text-[#667085]",
        ].join(" ")}
      >
        {!readOnly && (
          <ToolBar
            editor={editor as Editor}
            onImageUpload={imageAllowed ? onImageUpload : undefined}
            variant={richTextProps?.variant ?? "full"}
            isFullscreen={fullscreen}
            onToggleFullscreen={() => setFullscreen((f) => !f)}
          />
        )}
        <div
          className={`w-full px-2.5 overflow-y-auto ${fullscreen ? "flex-1" : "h-fit"}`}
          style={
            fullscreen
              ? undefined
              : {
                  ...(richTextProps?.maxHeight
                    ? { maxHeight: richTextProps.maxHeight }
                    : {}),
                  ...(richTextProps?.minHeight
                    ? { minHeight: richTextProps.minHeight }
                    : {}),
                }
          }
        >
          <EditorContent
            ref={ref}
            editor={editor}
            style={{ whiteSpace: "pre-line", width: "100%" }}
            onBlur={handleBlur}
            {...rest}
          />
          {!!error && (
            <Icon
              className="absolute bottom-0 right-3.5 translate-y-[-85%]"
              icon={"hugeicons:information-circle"}
              color="#F04438"
            />
          )}
        </div>
      </div>
    );
  },
);

TipTap.displayName = "TipTap";

export { TipTap };
