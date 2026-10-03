'use client';

import * as React from 'react';

import { deserializeMd } from '@platejs/markdown';
import { Plate, usePlateEditor } from 'platejs/react';

import { cn } from '@/lib/utils';
import { ImageUploaderContext } from '@/hooks/use-image-uploader';
import { EditorKit } from '@/components/editor/editor-kit';
import { QuestionEditorKit } from '@/components/editor/question-editor-kit';
import { discussionPlugin, type TDiscussion } from '@/components/editor/plugins/discussion-kit';
import { suggestionPlugin } from '@/components/editor/plugins/suggestion-kit';
import { FullscreenContext } from '@/components/editor/fullscreen-context';
import { Editor, EditorContainer } from '@/components/ui/editor';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useAdminAuthStore } from '@/src/store/auth.store';

export interface PlateEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  contentFormat?: 'markdown' | 'plate';
  onContentFormatChange?: (format: 'plate') => void;
  onImageUpload?: (file: File) => Promise<string | null>;
  error?: string;
  minHeight?: string;
  maxHeight?: string;
  slim?: boolean;
  /** Initial discussions to load (for editing questions with saved comments). */
  discussions?: TDiscussion[];
  /** Called whenever discussions change — use to capture for save payload. */
  onDiscussionsChange?: (discussions: TDiscussion[]) => void;
  /** Called once after Plate finishes initializing — value is the settled plate JSON. */
  onSettled?: (value: string) => void;
  /** Called when the user makes a content-changing edit (not fired during init normalization). */
  onUserEdit?: () => void;
}

const CONTENT_OPS = new Set([
  'insert_text', 'remove_text', 'insert_node', 'remove_node',
  'split_node', 'merge_node', 'move_node',
]);

export function PlateEditor({
  value = '',
  onChange,
  onBlur,
  contentFormat,
  onContentFormatChange,
  onImageUpload,
  error,
  minHeight = '160px',
  maxHeight,
  slim = false,
  discussions,
  onDiscussionsChange,
  onSettled,
  onUserEdit,
}: PlateEditorProps) {
  const { user } = useAdminAuthStore();

  // Detect format from actual content so explanation (markdown) inside a plate question
  // renders/edits correctly even when contentFormat field says 'plate'.
  // Fall back to contentFormat hint only when there's no value yet (new question).
  const isPlate = React.useMemo(() => {
    if (value) {
      try { const p = JSON.parse(value); return Array.isArray(p); }
      catch { return false; }
    }
    return contentFormat === 'plate';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally only evaluated at mount

  // Parse initial value for plate format synchronously; markdown is handled after mount
  const initialValue = React.useMemo(() => {
    if (isPlate && value) {
      try {
        return JSON.parse(value);
      } catch {
        // fall through to default
      }
    }
    return [{ type: 'p', children: [{ text: '' }] }];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally only evaluated at mount

  const editor = usePlateEditor({ plugins: slim ? QuestionEditorKit : EditorKit, value: initialValue });

  const [isFullscreen, setIsFullscreen] = React.useState(false);

  // Dismiss fullscreen on Escape
  React.useEffect(() => {
    if (!isFullscreen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsFullscreen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isFullscreen]);

  // Suppress onChange during programmatic initialization
  const isInitializingRef = React.useRef(true);

  // Deserialize markdown after mount (needs editor API)
  React.useEffect(() => {
    if (!isPlate && value) {
      try {
        const nodes = deserializeMd(editor, value);
        if (nodes?.length) {
          editor.tf.replaceNodes(nodes, { children: true, at: [] });
        }
      } catch {
        // keep empty editor on parse failure
      }
    }
    // Two rAFs: first lets Plate flush its internal batched changes, second clears our guard
    let raf2: number;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        isInitializingRef.current = false;
        onSettled?.(JSON.stringify(editor.children));
      });
    });
    return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Wire the logged-in admin as the current user in discussion/suggestion plugins.
  React.useEffect(() => {
    if (!user) return;
    const displayName = `${user.firstName} ${user.lastName}`.trim() || user.email;
    const userEntry = { id: user.id, name: displayName, avatarUrl: '' };
    try {
      editor.setOption(discussionPlugin, 'currentUserId', user.id);
      editor.setOption(discussionPlugin, 'users', { [user.id]: userEntry });
      editor.setOption(discussionPlugin, 'discussions', discussions ?? []);
      editor.setOption(suggestionPlugin, 'currentUserId', user.id);
    } catch {
      // plugins may not be registered in every editor variant
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleChange = React.useCallback(() => {
    if (!onChange || isInitializingRef.current) return;

    // Skip while transient AI nodes are in the tree (prevents serialization errors)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (editor.children.some((n: any) => n?.type === 'aiChat')) return;

    // Always persist as plate JSON — lossless, native format, supports all node types.
    // If the content arrived as markdown, notify the parent so it updates contentFormat
    // to 'plate' on the next save (one-time migration per question).
    onChange(JSON.stringify(editor.children));
    if (!isPlate) onContentFormatChange?.('plate');

    // Fire onUserEdit only when the user made a real content change (not normalization).
    if (onUserEdit && editor.operations.some((op) => CONTENT_OPS.has(op.type))) {
      onUserEdit();
    }

    // Emit current discussions so the parent can capture them for save.
    if (onDiscussionsChange) {
      try {
        const current = editor.getOption(discussionPlugin, 'discussions') as TDiscussion[] | undefined;
        onDiscussionsChange(current ?? []);
      } catch {
        // discussionPlugin not registered in this editor variant
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onChange, isPlate, onContentFormatChange, onDiscussionsChange, onUserEdit]);

  return (
    <FullscreenContext.Provider value={{ isFullscreen, toggle: () => setIsFullscreen((v) => !v) }}>
      <ImageUploaderContext.Provider value={onImageUpload ?? null}>
        <TooltipProvider>
          <div
            className={cn(
              isFullscreen
                ? 'fixed inset-0 z-9999 flex flex-col bg-white overflow-hidden'
                : 'relative',
            )}
          >
            <Plate editor={editor} onChange={handleChange}>
              <EditorContainer
                style={isFullscreen ? undefined : { maxHeight }}
                className={cn(
                  'border transition-colors duration-[.4s]',
                  isFullscreen ? 'flex-1 rounded-none border-0 overflow-auto' : 'rounded-md',
                  error
                    ? 'border-[#FDA29B]'
                    : 'border-[#D0D5DD] focus-within:border-[#007FFF]',
                )}
              >
                <Editor
                  variant="none"
                  className="w-full px-4 py-3 text-[1rem] leading-6"
                  style={isFullscreen ? { minHeight: '100%' } : { minHeight }}
                  onBlur={onBlur}
                />
              </EditorContainer>
            </Plate>
          </div>
        </TooltipProvider>
      </ImageUploaderContext.Provider>
    </FullscreenContext.Provider>
  );
}
