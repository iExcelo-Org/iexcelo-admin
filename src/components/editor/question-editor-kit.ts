'use client';

import { TrailingBlockPlugin } from 'platejs';

import { AlignKit } from '@/components/editor/plugins/align-kit';
import { AutoformatKit } from '@/components/editor/plugins/autoformat-kit';
import { BasicBlocksKit } from '@/components/editor/plugins/basic-blocks-kit';
import { BasicMarksKit } from '@/components/editor/plugins/basic-marks-kit';
import { CodeBlockKit } from '@/components/editor/plugins/code-block-kit';
import { CommentKit } from '@/components/editor/plugins/comment-kit';
import { DiscussionKit } from '@/components/editor/plugins/discussion-kit';
import { ExitBreakKit } from '@/components/editor/plugins/exit-break-kit';
import { FixedToolbarKit } from '@/components/editor/plugins/fixed-toolbar-kit';
import { FloatingToolbarKit } from '@/components/editor/plugins/floating-toolbar-kit';
import { FontKit } from '@/components/editor/plugins/font-kit';
import { LineHeightKit } from '@/components/editor/plugins/line-height-kit';
import { LinkKit } from '@/components/editor/plugins/link-kit';
import { ListKit } from '@/components/editor/plugins/list-kit';
import { MarkdownKit } from '@/components/editor/plugins/markdown-kit';
import { MathKit } from '@/components/editor/plugins/math-kit';
import { MediaKit } from '@/components/editor/plugins/media-kit';
import { SuggestionKit } from '@/components/editor/plugins/suggestion-kit';
import { TableKit } from '@/components/editor/plugins/table-kit';

// Stripped-down kit for question/explanation editors.
// Excludes: CursorOverlay, DnD, Emoji, Mention, Slash, TOC, Toggle,
// Callout, Column, Date, BlockMenu, BlockPlaceholder, Docx.
export const QuestionEditorKit = [
  // Elements
  ...BasicBlocksKit,
  ...CodeBlockKit,
  ...TableKit,
  ...MathKit,
  ...MediaKit,
  ...LinkKit,

  // Marks
  ...BasicMarksKit,
  ...FontKit,

  // Block style
  ...ListKit,
  ...AlignKit,
  ...LineHeightKit,

  // Collaboration
  ...CommentKit,
  ...DiscussionKit,
  ...SuggestionKit,

  // Editing
  ...AutoformatKit,
  ...ExitBreakKit,
  TrailingBlockPlugin,

  // Parsers
  ...MarkdownKit,

  // UI
  ...FixedToolbarKit,
  ...FloatingToolbarKit,
];
