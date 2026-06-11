/** Parse --ds-viewer-bg CSS variable to a Three.js hex color number. */
export function getViewerBackgroundColor(): number {
  if (typeof window === 'undefined') return 0x0b1220;
  const value = getComputedStyle(document.documentElement).getPropertyValue('--ds-viewer-bg').trim();
  if (!value) return 0x0b1220;
  const hex = value.replace('#', '');
  if (/^[0-9a-fA-F]{6}$/.test(hex)) {
    return parseInt(hex, 16);
  }
  return 0x0b1220;
}
