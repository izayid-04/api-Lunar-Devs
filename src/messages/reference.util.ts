// Human-readable confirmation code, e.g. "NT-0001". Derived from the
// auto-increment id, so it's only known once the row has been inserted.
export function buildMessageReference(id: number): string {
  return `NT-${String(id).padStart(4, '0')}`;
}
