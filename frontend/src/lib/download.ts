import { mediaUrl } from '@/lib/utils';

/** Trigger a browser download of a text blob. */
export function downloadText(filename: string, text: string, type = 'text/markdown'): void {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, filename);
  URL.revokeObjectURL(url);
}

/** Download a remote media asset (fetches then saves). */
export async function downloadMedia(path: string, filename: string): Promise<void> {
  const response = await fetch(mediaUrl(path));
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  triggerDownload(url, filename);
  URL.revokeObjectURL(url);
}

function triggerDownload(url: string, filename: string): void {
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

/** Copy text to the clipboard, returning success. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Share via the Web Share API when available, else copy the URL. */
export async function shareResult(title: string, text: string): Promise<'shared' | 'copied' | 'failed'> {
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url: window.location.href });
      return 'shared';
    } catch {
      return 'failed';
    }
  }
  return (await copyText(window.location.href)) ? 'copied' : 'failed';
}
