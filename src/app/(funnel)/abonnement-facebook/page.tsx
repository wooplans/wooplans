export const runtime = "edge";
import { permanentRedirect } from "next/navigation";
export default function LegacySalesPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
 const query = new URLSearchParams();
 for (const [key, value] of Object.entries(searchParams)) { if (Array.isArray(value)) value.forEach(v => query.append(key, v)); else if (value) query.set(key, value); }
 permanentRedirect(`/abonnement${query.size ? `?${query}` : ""}`);
}
