import { Mark, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    subscript: { toggleSubscript: () => ReturnType };
    superscript: { toggleSuperscript: () => ReturnType };
  }
}

// Minimal subscript/superscript marks built against the installed @tiptap/core
// version so there are no peer-dep mismatches with the official extension packages.

export const SubscriptMarkdown = Mark.create({
  name: "subscript",

  parseHTML() {
    return [
      { tag: "sub" },
      { style: "vertical-align", getAttrs: (v) => (v === "sub" ? null : false) },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["sub", mergeAttributes(HTMLAttributes), 0];
  },

  addCommands() {
    return {
      toggleSubscript:
        () =>
        ({ commands }) =>
          commands.toggleMark(this.name),
    };
  },

  addKeyboardShortcuts() {
    return { "Mod-,": () => this.editor.commands.toggleSubscript() };
  },

  addStorage() {
    return {
      markdown: {
        serialize: {
          open: "<sub>",
          close: "</sub>",
          mixable: true,
          expelEnclosingWhitespace: true,
        },
        parse: {},
      },
    };
  },
});

export const SuperscriptMarkdown = Mark.create({
  name: "superscript",

  parseHTML() {
    return [
      { tag: "sup" },
      { style: "vertical-align", getAttrs: (v) => (v === "super" ? null : false) },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["sup", mergeAttributes(HTMLAttributes), 0];
  },

  addCommands() {
    return {
      toggleSuperscript:
        () =>
        ({ commands }) =>
          commands.toggleMark(this.name),
    };
  },

  addKeyboardShortcuts() {
    return { "Mod-.": () => this.editor.commands.toggleSuperscript() };
  },

  addStorage() {
    return {
      markdown: {
        serialize: {
          open: "<sup>",
          close: "</sup>",
          mixable: true,
          expelEnclosingWhitespace: true,
        },
        parse: {},
      },
    };
  },
});
