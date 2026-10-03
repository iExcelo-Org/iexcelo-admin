'use client';

import { createContext, useContext } from 'react';

export type ImageUploader = (file: File) => Promise<string | null>;

export const ImageUploaderContext = createContext<ImageUploader | null>(null);

export const useImageUploader = () => useContext(ImageUploaderContext);
