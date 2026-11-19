"use client";

import type { FocusEvent } from "react";
import dynamic from "next/dynamic";

import type { PlateEditorProps as CoreProps } from "@/components/editor/plate-editor";

import type { TDiscussion } from "@/components/editor/plugins/discussion-kit";

// The editor only runs in the browser. Imported normally, the whole Plate kit (diagrams,
// code highlighting, Word import and export, video players) went into the server bundle of
// every page that uses InputField, which took the Worker past Cloudflare's size limit.
// Loading it with ssr: false keeps it out of the server bundle and out of pages that never
// show an editor.
const PlateEditorCore = dynamic(
  () => import("@/components/editor/plate-editor").then((m) => m.PlateEditor),
  {
    ssr: false,
    loading: () => (
      <div
        aria-busy="true"
        className="min-h-[204px] animate-pulse rounded-md border border-[#D0D5DD] bg-[#F9FAFB]"
      />
    ),
  },
);

export type PlateEditorProps = {
  name?: string;
  value?: string;
  onChange?: (e: { target: { name?: string; value: string } }) => void;
  onBlur?: (e: FocusEvent<HTMLElement>) => void;
  contentFormat?: "markdown" | "plate";
  onContentFormatChange?: (format: "plate") => void;
  onImageUpload?: (file: File) => Promise<string | null>;
  error?: string;
  slim?: boolean;
  /** Initial Plate.js discussion threads. Only applicable when slim=true (question editor). */
  discussions?: TDiscussion[];
  /** Called when discussion threads change. Only applicable when slim=true. */
  onDiscussionsChange?: (discussions: TDiscussion[]) => void;
  /** Called once after Plate initialization settles — receives the post-init plate JSON. */
  onSettled?: (value: string) => void;
  /** Called when the user makes a content-changing edit (not fired during init normalization). */
  onUserEdit?: () => void;
  richTextProps?: {
    maxHeight?: string;
    minHeight?: string;
  };
};

export function PlateEditor({
  name,
  value = "",
  onChange,
  onBlur,
  contentFormat,
  onContentFormatChange,
  onImageUpload,
  error,
  slim,
  discussions,
  onDiscussionsChange,
  onSettled,
  onUserEdit,
  richTextProps,
}: PlateEditorProps) {
  const coreProps: CoreProps = {
    value,
    contentFormat,
    onContentFormatChange,
    onImageUpload,
    error,
    slim,
    minHeight: richTextProps?.minHeight,
    maxHeight: richTextProps?.maxHeight,
    discussions,
    onDiscussionsChange,
    onSettled,
    onUserEdit,
  };

  if (onChange) {
    coreProps.onChange = (v: string) =>
      onChange({ target: { name, value: v } });
  }

  if (onBlur) {
    // PlateEditor core expects () => void; wrap to satisfy the form's FocusEvent signature
    coreProps.onBlur = () => onBlur({} as FocusEvent<HTMLElement>);
  }

  return <PlateEditorCore {...coreProps} />;
}
