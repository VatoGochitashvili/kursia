/**
 * The same photo, at the size it is actually drawn.
 *
 * Circle covers are stored as full 1600px photographs — right for the banner
 * across the top of a circle, and about ten times too much for a card in a
 * grid or a 48px thumbnail. The home page alone drew a dozen of them, roughly
 * two megabytes of pictures to show postage stamps.
 *
 * Unsplash resizes on its own CDN from query parameters, so a smaller copy
 * costs nothing but the URL: width, quality, and `auto=format` for WebP/AVIF
 * where the browser takes it. Any other host is returned untouched — its
 * image is whatever size its owner uploaded.
 */
export function imageAt(url: string | null | undefined, width: number): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "images.unsplash.com") return url;
    parsed.searchParams.set("w", String(width));
    parsed.searchParams.set("q", "70");
    parsed.searchParams.set("auto", "format");
    parsed.searchParams.set("fit", "crop");
    return parsed.toString();
  } catch {
    // A relative path to our own storage — not a URL to rewrite.
    return url;
  }
}
