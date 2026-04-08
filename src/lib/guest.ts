const GUEST_KEY = "rnz-guest-id";

export function getGuestId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(GUEST_KEY);
  if (!id) {
    id = `guest_${crypto.randomUUID()}`;
    localStorage.setItem(GUEST_KEY, id);
  }
  return id;
}

export function isGuestId(id: string): boolean {
  return id.startsWith("guest_");
}

export function clearGuestId(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(GUEST_KEY);
}
