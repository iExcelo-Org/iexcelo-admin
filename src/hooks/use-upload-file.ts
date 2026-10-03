'use client';

import * as React from 'react';

import { toast } from 'sonner';

import { useImageUploader } from '@/hooks/use-image-uploader';

export type UploadedFile<T = unknown> = {
  key: string;
  appUrl: string;
  name: string;
  size: number;
  type: string;
  url: string;
  serverData?: T;
};

interface UseUploadFileProps {
  onUploadComplete?: (file: UploadedFile) => void;
  onUploadError?: (error: unknown) => void;
}

export function useUploadFile({
  onUploadComplete,
  onUploadError,
}: UseUploadFileProps = {}) {
  const customUploader = useImageUploader();
  const [uploadedFile, setUploadedFile] = React.useState<UploadedFile>();
  const [uploadingFile, setUploadingFile] = React.useState<File>();
  const [progress, setProgress] = React.useState<number>(0);
  const [isUploading, setIsUploading] = React.useState(false);

  async function uploadThing(file: File) {
    setIsUploading(true);
    setUploadingFile(file);
    setProgress(10);

    try {
      let url: string | null = null;

      if (customUploader) {
        url = await customUploader(file);
      }

      if (!url) {
        url = URL.createObjectURL(file);
      }

      setProgress(100);

      const result: UploadedFile = {
        key: typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString(36),
        appUrl: url,
        name: file.name,
        size: file.size,
        type: file.type,
        url,
      };

      setUploadedFile(result);
      onUploadComplete?.(result);
      return result;
    } catch (error) {
      toast.error('Failed to upload file');
      onUploadError?.(error);
    } finally {
      setProgress(0);
      setIsUploading(false);
      setUploadingFile(undefined);
    }
  }

  return {
    isUploading,
    progress,
    uploadedFile,
    uploadFile: uploadThing,
    uploadingFile,
  };
}

export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return 'Something went wrong, please try again later.';
}

export function showErrorToast(err: unknown) {
  toast.error(getErrorMessage(err));
}

// Stubs for UploadThing compatibility used by other generated files
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
export const uploadFiles = async (..._args: any[]) => [];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const useUploadThing = () => ({ startUpload: async () => [] as any[] });
