type Room = {
  name: string;
  area: number;
};

type RoomTableProps = {
  rooms: Room[];
};

function cleanRoomName(name: string): string {
  return name
    .replace(/\s*RDC\s*/gi, ' ')
    .replace(/\s*ETAGE\s*/gi, ' ')
    .replace(/\s*\d+\s*/g, ' ')
    .trim();
}

function processRooms(rooms: Room[]): string[] {
  const cleaned: Map<string, Set<string>> = new Map();

  for (const room of rooms) {
    const cleanedName = cleanRoomName(room.name);
    const normalizedName = cleanedName.toLowerCase();

    if (normalizedName.includes('chambre')) {
      const key = 'Chambres';
      if (!cleaned.has(key)) cleaned.set(key, new Set());
      cleaned.get(key)!.add(cleanedName);
    } else if (normalizedName.includes('salle de bain') || normalizedName.includes('sdb')) {
      const key = 'Salles de bain';
      if (!cleaned.has(key)) cleaned.set(key, new Set());
      cleaned.get(key)!.add(cleanedName);
    } else {
      if (!cleaned.has(cleanedName)) cleaned.set(cleanedName, new Set());
      cleaned.get(cleanedName)!.add(cleanedName);
    }
  }

  const result: string[] = [];
  for (const [name, items] of Array.from(cleaned.entries())) {
    if (items.size > 1) {
      result.push(`${name} (${items.size})`);
    } else {
      result.push(name);
    }
  }

  return result;
}

export function RoomTable({ rooms }: RoomTableProps) {
  if (rooms.length === 0) {
    return null;
  }

  const processedRooms = processRooms(rooms);

  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-4 tracking-tight">
        Composition des pièces
      </h2>
      <ul className="space-y-2 list-disc list-inside">
        {processedRooms.map((room, i) => (
          <li key={i} className="text-foreground/70">
            {room}
          </li>
        ))}
      </ul>
    </div>
  );
}
