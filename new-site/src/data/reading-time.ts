/** Minutes to read a Markdown body at about 230 words per minute, rounded up, at least 1. */
export function readingTime(body: string | undefined): number {
  const words = (body ?? '').replace(/```[\s\S]*?```/g, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 230));
}
