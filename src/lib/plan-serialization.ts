export type SerializedRoom = {
  name: string;
  area: number;
};

function safeJsonParse(value: string, fallback: unknown) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function parseRooms(value: string): SerializedRoom[] {
  const parsed = safeJsonParse(value, []);
  if (!Array.isArray(parsed)) return [];

  return parsed
    .filter((room): room is Record<string, unknown> => Boolean(room) && typeof room === "object")
    .map((room) => ({
      name: typeof room.name === "string" ? room.name : "",
      area: Number(room.area) || 0,
    }))
    .filter((room) => room.name.trim().length > 0);
}

export function parseStringArray(value: string): string[] {
  const parsed = safeJsonParse(value, []);
  if (!Array.isArray(parsed)) return [];

  return parsed
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function stringifyRooms(value: SerializedRoom[] | undefined) {
  return JSON.stringify((value ?? []).filter((room) => room.name.trim()));
}

export function stringifyStringArray(value: string[] | undefined) {
  return JSON.stringify((value ?? []).map((item) => item.trim()).filter(Boolean));
}
