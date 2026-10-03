import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";

export interface MathSuggestionState {
  active: true;
  from: number;
  to: number;
  query: string;
  coords: { top: number; left: number; bottom: number; right: number };
}

export const MathSuggestionExtension = Extension.create<{
  onUpdate: (state: MathSuggestionState | null) => void;
}>({
  name: "mathSuggestion",

  addOptions() {
    return { onUpdate: () => {} };
  },

  addProseMirrorPlugins() {
    const { onUpdate } = this.options;

    return [
      new Plugin({
        key: new PluginKey("mathSuggestion"),
        view(editorView: EditorView) {
          let slashFrom: number | null = null;

          const emit = () => {
            if (slashFrom === null) return;
            const { from: cursor } = editorView.state.selection;

            if (cursor <= slashFrom) {
              slashFrom = null;
              onUpdate(null);
              return;
            }

            const text = editorView.state.doc.textBetween(slashFrom, cursor);
            if (!text.startsWith("\\")) {
              slashFrom = null;
              onUpdate(null);
              return;
            }

            let coords: MathSuggestionState["coords"];
            try {
              coords = editorView.coordsAtPos(slashFrom);
            } catch {
              slashFrom = null;
              onUpdate(null);
              return;
            }

            onUpdate({ active: true, from: slashFrom, to: cursor, query: text.slice(1), coords });
          };

          const onKeydown = (e: KeyboardEvent) => {
            if (e.key === "\\") {
              slashFrom = editorView.state.selection.from;
              return;
            }
            if (slashFrom !== null) {
              if (e.key === "Escape") { slashFrom = null; onUpdate(null); }
              if (e.key === " ")     { slashFrom = null; onUpdate(null); }
            }
          };

          const onInput = () => emit();
          const onBlur  = () => { slashFrom = null; onUpdate(null); };

          const dom = editorView.dom;
          dom.addEventListener("keydown", onKeydown);
          dom.addEventListener("input",   onInput);
          dom.addEventListener("blur",    onBlur);

          return {
            destroy() {
              dom.removeEventListener("keydown", onKeydown);
              dom.removeEventListener("input",   onInput);
              dom.removeEventListener("blur",    onBlur);
            },
          };
        },
      }),
    ];
  },
});
