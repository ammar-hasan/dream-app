/** Paste images from the clipboard straight onto the canvas. */

import { useEffect } from 'react';
import { importImageFiles } from './importImage';

export function useImagePaste(): void {
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files ?? []);
      if (files.length === 0) return;
      e.preventDefault();
      void importImageFiles(files);
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, []);
}
