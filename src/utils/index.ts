export * from "./constants";
export * from "./error-handler";

const PLATE_BLOCK_TYPES = new Set([
  'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'blockquote', 'code_block', 'code_line',
  'table', 'tr', 'td', 'th',
  'column_group', 'column', 'hr',
]);

function walkPlateNode(n: unknown): string {
  if (typeof n !== 'object' || !n) return '';
  const node = n as Record<string, unknown>;
  // Text leaf — return raw text (bold/italic marks ignored, text extracted)
  if ('text' in node) return String(node.text ?? '');
  const type = String(node.type ?? '');
  if (type === 'equation' || type === 'inline_equation') return '[formula] ';
  if (type === 'img') return '(Image) ';
  const childText = Array.isArray(node.children)
    ? (node.children as unknown[]).map(walkPlateNode).join('')
    : '';
  // Block-level nodes get a trailing space so adjacent blocks are separated
  return PLATE_BLOCK_TYPES.has(type) ? childText + ' ' : childText;
}

function extractPlateText(content: string): string {
  try {
    const nodes = JSON.parse(content);
    if (!Array.isArray(nodes)) return content;
    return (nodes as unknown[]).map(walkPlateNode).join('').replace(/\s+/g, ' ').trim();
  } catch {
    return content;
  }
}

export function stripMarkdownPreview(
  content: string,
  maxLen = 120,
  ellipsis = false,
): string {
  // Detect Plate JSON (array of Slate nodes) and extract plain text directly.
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      const text = extractPlateText(content);
      const truncated = text.slice(0, maxLen);
      return ellipsis && text.length > maxLen ? truncated + '…' : truncated;
    }
  } catch { /* not JSON — fall through to markdown stripping */ }

  const stripped = content
    // Math HTML elements (TipTap stores math as data-type attributes) → readable placeholder
    .replace(
      /<(?:span|div)[^>]*data-type="(?:inline|block)-math"[^>]*/gi,
      "[formula]",
    )
    .replace(/<\/(p|div|li|blockquote|h[1-6])>/gi, " ")
    .replace(/<(br|hr)\s*\/?>/gi, " ")
    .replace(/<img[^>]*>/gi, "(Image)")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "(Image)")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/#+\s/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&[a-z#0-9]+;/gi, " ")
    // Block math ($$...$$) may span multiple lines
    .replace(/\$\$([\s\S]*?)\$\$/g, "[formula]")
    // Inline math ($...$) — single line only
    .replace(/\$([^$\n]+)\$/g, "[formula]")
    // Unescape Markdown escape sequences (Turndown escapes _ as \_ to prevent emphasis parsing)
    .replace(/\\([_*[\]()~>#+=|{}.!\-])/g, "$1")
    // tiptap-markdown hard line breaks: backslash(es) immediately before newline → space
    .replace(/\\+\n/g, " ")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const truncated = stripped.slice(0, maxLen);
  return ellipsis && stripped.length > maxLen ? truncated + "…" : truncated;
}
