type Room = {
  name: string;
  area: number;
};

type RoomTableProps = {
  rooms: Room[];
};

function cleanRoomName(name: string): string {
  return name
    .replace(/\s*RDC\s*/gi, " ")
    .replace(/\s*ETAGE\s*/gi, " ")
    .replace(/\s*\d+\s*/g, " ")
    .trim();
}

function processRooms(rooms: Room[]): string[] {
  const cleaned: Map<string, Set<string>> = new Map();

  for (const room of rooms) {
    const cleanedName = cleanRoomName(room.name);
    const normalizedName = cleanedName.toLowerCase();

    if (normalizedName.includes("chambre")) {
      const key = "Chambres";
      if (!cleaned.has(key)) cleaned.set(key, new Set());
      cleaned.get(key)!.add(cleanedName);
    } else if (normalizedName.includes("salle de bain") || normalizedName.includes("sdb")) {
      const key = "Salles de bain";
      if (!cleaned.has(key)) cleaned.set(key, new Set());
      cleaned.get(key)!.add(cleanedName);
    } else {
      if (!cleaned.has(cleanedName)) cleaned.set(cleanedName, new Set());
      cleaned.get(cleanedName)!.add(cleanedName);
    }
  }

  const result: string[] = [];
  for (const [name, items] of Array.from(cleaned.entries())) {
    result.push(items.size > 1 ? `${name} (${items.size})` : name);
  }

  return result;
}

export function RoomTable({ rooms }: RoomTableProps) {
  if (rooms.length === 0) {
    return null;
  }

  const processedRooms = processRooms(rooms);

  return (
    <div className="rounded-[2rem] border border-outline/10 bg-surface p-6 shadow-[0_18px_60px_rgba(38,33,29,0.05)]">
      <h2 className="font-display text-3xl text-foreground">
        Composition des pièces
      </h2>
      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
        {processedRooms.map((room, i) => (
          <li key={i} className="rounded-full bg-background px-4 py-3 text-sm font-semibold text-foreground/75">
            {room}
          </li>
        ))}
      </ul>
    </div>
  );
}
