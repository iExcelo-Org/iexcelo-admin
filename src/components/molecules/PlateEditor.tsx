"use client";

import type { FocusEvent } from "react";

import {
  PlateEditor as PlateEditorCore,
  type PlateEditorProps as CoreProps,
} from "@/components/editor/plate-editor";

import type { TDiscussion } from "@/components/editor/plugins/discussion-kit";

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
