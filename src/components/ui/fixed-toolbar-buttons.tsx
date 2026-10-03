'use client';

import * as React from 'react';

import {
  ArrowUpToLineIcon,
  BaselineIcon,
  BoldIcon,
  Code2Icon,
  HighlighterIcon,
  ItalicIcon,
  Maximize2Icon,
  Minimize2Icon,
  PaintBucketIcon,
  StrikethroughIcon,
  UnderlineIcon,
} from 'lucide-react';
import { KEYS } from 'platejs';
import { useEditorReadOnly, useEditorRef } from 'platejs/react';
import { createPortal } from 'react-dom';

import { MathLiveField } from '@/components/molecules/MathLiveField';
import { MathPicker } from '@/components/molecules/MathPicker';
import { ToolbarTooltipButton } from '@/components/ui/toolbar-tooltip-button';
import { useFullscreen } from '@/components/editor/fullscreen-context';
import { AlignToolbarButton } from './align-toolbar-button';
import { CommentToolbarButton } from './comment-toolbar-button';
import { EmojiToolbarButton } from './emoji-toolbar-button';
import { ExportToolbarButton } from './export-toolbar-button';
import { FontColorToolbarButton } from './font-color-toolbar-button';
import { FontSizeToolbarButton } from './font-size-toolbar-button';
import { RedoToolbarButton, UndoToolbarButton } from './history-toolbar-button';
import { ImportToolbarButton } from './import-toolbar-button';
import {
  IndentToolbarButton,
  OutdentToolbarButton,
} from './indent-toolbar-button';
import { InsertToolbarButton } from './insert-toolbar-button';
import { LineHeightToolbarButton } from './line-height-toolbar-button';
import { LinkToolbarButton } from './link-toolbar-button';
import {
  BulletedListToolbarButton,
  NumberedListToolbarButton,
  TodoListToolbarButton,
} from './list-toolbar-button';
import { MarkToolbarButton } from './mark-toolbar-button';
import { MediaToolbarButton } from './media-toolbar-button';
import { ModeToolbarButton } from './mode-toolbar-button';
import { MoreToolbarButton } from './more-toolbar-button';
import { TableToolbarButton } from './table-toolbar-button';
import { ToggleToolbarButton } from './toggle-toolbar-button';
import { ToolbarButton, ToolbarGroup } from './toolbar';
import { TurnIntoToolbarButton } from './turn-into-toolbar-button';

// ─── Math keyboard for Plate ──────────────────────────────────────────────────

function PlateMathKeyboardButton() {
  const editor = useEditorRef();
  const [open, setOpen] = React.useState(false);
  const [latex, setLatex] = React.useState('');
  const [style, setStyle] = React.useState<React.CSSProperties>({});
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);

  const calcPos = React.useCallback(() => {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    const vpW = window.innerWidth;
    const popW = 380;
    let left = r.left;
    if (left + popW > vpW - 8) left = vpW - popW - 8;
    setStyle({ position: 'fixed', top: r.bottom + 6, left, width: popW, zIndex: 9999 });
  }, []);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!triggerRef.current?.contains(t) && !panelRef.current?.contains(t)) {
        setOpen(false);
        setLatex('');
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    window.addEventListener('scroll', calcPos, true);
    window.addEventListener('resize', calcPos);
    return () => {
      window.removeEventListener('scroll', calcPos, true);
      window.removeEventListener('resize', calcPos);
    };
  }, [open, calcPos]);

  const insert = (block: boolean) => {
    if (!latex.trim()) return;
    if (block) {
      editor.tf.insertNodes({
        type: 'equation',
        texExpression: latex,
        children: [{ text: '' }],
      });
    } else {
      editor.tf.insertNodes({
        type: 'inline_equation',
        texExpression: latex,
        children: [{ text: '' }],
      });
    }
    editor.tf.focus();
    setOpen(false);
    setLatex('');
  };

  const panel = open ? (
    <div
      ref={panelRef}
      style={{
        ...style,
        boxShadow: '0 20px 40px -8px rgba(16,24,40,0.14), 0 0 0 1px rgba(0,0,0,0.04)',
        borderRadius: 12,
        background: 'white',
        border: '1px solid #EAECF0',
        overflow: 'hidden',
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
      <ToolbarTooltipButton
        ref={triggerRef}
        tooltip="Visual Math Keyboard"
        active={open}
        onClick={() => {
          const next = !open;
          if (next) calcPos();
          setOpen(next);
          if (!next) setLatex('');
        }}
      >
        ⌨
      </ToolbarTooltipButton>
      {typeof document !== 'undefined' && panel && createPortal(panel, document.body)}
    </>
  );
}

// ─── MathPicker wrapper for Plate ────────────────────────────────────────────

function PlateMathPickerButton() {
  const editor = useEditorRef();
  return (
    <MathPicker
      onInsertInline={(latex) => {
        editor.tf.insertNodes({
          type: 'inline_equation',
          texExpression: latex,
          children: [{ text: '' }],
        });
        editor.tf.focus();
      }}
      onInsertBlock={(latex) => {
        editor.tf.insertNodes({
          type: 'equation',
          texExpression: latex,
          children: [{ text: '' }],
        });
        editor.tf.focus();
      }}
    />
  );
}

// ─── Fullscreen toggle button ─────────────────────────────────────────────────

function FullscreenButton() {
  const { isFullscreen, toggle } = useFullscreen();
  return (
    <ToolbarButton
      tooltip={isFullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen'}
      onClick={toggle}
    >
      {isFullscreen ? <Minimize2Icon /> : <Maximize2Icon />}
    </ToolbarButton>
  );
}

// ─── Main toolbar ─────────────────────────────────────────────────────────────

export function FixedToolbarButtons() {
  const readOnly = useEditorReadOnly();

  return (
    <div className="flex w-full">
      {!readOnly && (
        <>
          <ToolbarGroup>
            <UndoToolbarButton />
            <RedoToolbarButton />
          </ToolbarGroup>

          <ToolbarGroup>
            <ExportToolbarButton>
              <ArrowUpToLineIcon />
            </ExportToolbarButton>

            <ImportToolbarButton />
          </ToolbarGroup>

          <ToolbarGroup>
            <InsertToolbarButton />
            <TurnIntoToolbarButton />
            <FontSizeToolbarButton />
          </ToolbarGroup>

          <ToolbarGroup>
            <MarkToolbarButton nodeType={KEYS.bold} tooltip="Bold (⌘+B)">
              <BoldIcon />
            </MarkToolbarButton>

            <MarkToolbarButton nodeType={KEYS.italic} tooltip="Italic (⌘+I)">
              <ItalicIcon />
            </MarkToolbarButton>

            <MarkToolbarButton
              nodeType={KEYS.underline}
              tooltip="Underline (⌘+U)"
            >
              <UnderlineIcon />
            </MarkToolbarButton>

            <MarkToolbarButton
              nodeType={KEYS.strikethrough}
              tooltip="Strikethrough (⌘+⇧+M)"
            >
              <StrikethroughIcon />
            </MarkToolbarButton>

            <MarkToolbarButton nodeType={KEYS.code} tooltip="Code (⌘+E)">
              <Code2Icon />
            </MarkToolbarButton>

            <FontColorToolbarButton nodeType={KEYS.color} tooltip="Text color">
              <BaselineIcon />
            </FontColorToolbarButton>

            <FontColorToolbarButton
              nodeType={KEYS.backgroundColor}
              tooltip="Background color"
            >
              <PaintBucketIcon />
            </FontColorToolbarButton>
          </ToolbarGroup>

          <ToolbarGroup>
            <AlignToolbarButton />

            <NumberedListToolbarButton />
            <BulletedListToolbarButton />
            <TodoListToolbarButton />
            <ToggleToolbarButton />
          </ToolbarGroup>

          <ToolbarGroup>
            <LinkToolbarButton />
            <TableToolbarButton />
            <EmojiToolbarButton />
            <PlateMathPickerButton />
            <PlateMathKeyboardButton />
          </ToolbarGroup>

          <ToolbarGroup>
            <MediaToolbarButton nodeType={KEYS.img} />
            <MediaToolbarButton nodeType={KEYS.video} />
            <MediaToolbarButton nodeType={KEYS.audio} />
            <MediaToolbarButton nodeType={KEYS.file} />
          </ToolbarGroup>

          <ToolbarGroup>
            <LineHeightToolbarButton />
            <OutdentToolbarButton />
            <IndentToolbarButton />
          </ToolbarGroup>

          <ToolbarGroup>
            <MoreToolbarButton />
          </ToolbarGroup>
        </>
      )}

      <div className="grow" />

      <ToolbarGroup>
        <MarkToolbarButton nodeType={KEYS.highlight} tooltip="Highlight">
          <HighlighterIcon />
        </MarkToolbarButton>
        <CommentToolbarButton />
      </ToolbarGroup>

      <ToolbarGroup>
        <ModeToolbarButton />
      </ToolbarGroup>

      <ToolbarGroup>
        <FullscreenButton />
      </ToolbarGroup>
    </div>
  );
}
