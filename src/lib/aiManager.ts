export function getAiManagerBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_AI_MANAGER_URL;
  const trimmed = typeof raw === "string" ? raw.trim() : "";
  return trimmed || "http://127.0.0.1:7337";
}
