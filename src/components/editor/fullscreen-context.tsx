'use client';

import * as React from 'react';

export interface FullscreenContextValue {
  isFullscreen: boolean;
  toggle: () => void;
}

export const FullscreenContext = React.createContext<FullscreenContextValue>({
  isFullscreen: false,
  toggle: () => {},
});

export const useFullscreen = () => React.useContext(FullscreenContext);
