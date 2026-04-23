"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ImageUploader, ThumbnailUploader } from "./components/ImageUploader";
import { AIPlanImporter } from "./components/AIPlanImporter";

type Room = { name: string; area: number };

type PlanFormData = {
  name: string;
  slug: string;
  category: string;
  description: string;
  surface: string;
  bedrooms: string;
  bathrooms: string;
  floors: string;
  thumbnail: string;
  estimatedCost: string;
  estimatedCostImage: string;
  featured: boolean;
  published: boolean;
};

type PlanFormProps = {
  mode: "create" | "edit";
  planId?: string;
  initialData?: {
    name?: string;
    slug?: string;
    category?: string;
    description?: string;
    surface?: number | string;
    bedrooms?: number | string;
    bathrooms?: number | string;
    floors?: number | string;
    thumbnail?: string;
    estimatedCost?: number | string;
    estimatedCostImage?: string;
    distributionPlans?: string[];
    featured?: boolean;
    published?: boolean;
    rooms?: Room[];
    images?: string[];
  };
};

const defaultForm: PlanFormData = {
  name: "",
  slug: "",
  category: "villa",
  description: "",
  surface: "",
  bedrooms: "",
  bathrooms: "",
  floors: "1",
  thumbnail: "",
  estimatedCost: "",
  estimatedCostImage: "",
  featured: false,
  published: false,
};

function toFormState(d: NonNullable<PlanFormProps["initialData"]>): PlanFormData {
  return {
    name: d.name ?? "",
    slug: d.slug ?? "",
    category: d.category ?? "villa",
    description: d.description ?? "",
    surface: String(d.surface ?? ""),
    bedrooms: String(d.bedrooms ?? ""),
    bathrooms: String(d.bathrooms ?? ""),
    floors: String(d.floors ?? "1"),
    thumbnail: d.thumbnail ?? "",
    estimatedCost: String(d.estimatedCost ?? ""),
    estimatedCostImage: d.estimatedCostImage ?? "",
    featured: d.featured ?? false,
    published: d.published ?? false,
  };
}

function cleanRoomName(name: string): string {
  return name
    .replace(/\s*RDC\s*/gi, ' ')
    .replace(/\s*ETAGE\s*/gi, ' ')
    .replace(/\s*\d+\s*/g, ' ')
    .trim();
}

function groupProcessedRooms(rooms: Room[]): { label: string; count: number }[] {
  const grouped: Map<string, number> = new Map();

  for (const room of rooms) {
    const cleanedName = cleanRoomName(room.name);
    const normalizedName = cleanedName.toLowerCase();

    if (normalizedName.includes('chambre')) {
      const key = 'Chambres';
      grouped.set(key, (grouped.get(key) || 0) + 1);
    } else if (normalizedName.includes('salle de bain') || normalizedName.includes('sdb')) {
      const key = 'Salles de bain';
      grouped.set(key, (grouped.get(key) || 0) + 1);
    } else {
      grouped.set(cleanedName, (grouped.get(cleanedName) || 0) + 1);
    }
  }

  return Array.from(grouped.entries()).map(([label, count]) => ({ label, count }));
}

export function PlanForm({ mode, planId, initialData }: PlanFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState<PlanFormData>(
    initialData ? toFormState(initialData) : defaultForm,
  );

  const [rooms, setRooms] = useState<Room[]>(
    initialData?.rooms && initialData.rooms.length > 0
      ? initialData.rooms
      : [{ name: "", area: 0 }],
  );

  const [images, setImages] = useState<string[]>(
    initialData?.images && initialData.images.length > 0
      ? initialData.images
      : [],
  );

  const [distributionPlans, setDistributionPlans] = useState<string[]>(
    initialData?.distributionPlans && initialData.distributionPlans.length > 0
      ? initialData.distributionPlans
      : [],
  );

  function handleAIExtracted(data: {
    name: string;
    category: string;
    description: string;
    surface: number;
    bedrooms: number;
    bathrooms: number;
    floors: number;
    rooms: Room[];
    estimatedCost: number;
  }) {
    const slug = data.name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
    setForm((prev) => ({
      ...prev,
      name: data.name || prev.name,
      slug: slug || prev.slug,
      category: data.category || prev.category,
      description: data.description || prev.description,
      surface: String(data.surface || prev.surface),
      bedrooms: String(data.bedrooms || prev.bedrooms),
      bathrooms: String(data.bathrooms || prev.bathrooms),
      floors: String(data.floors || prev.floors),
      estimatedCost: String(data.estimatedCost || prev.estimatedCost),
    }));
    if (data.rooms && data.rooms.length > 0) {
      setRooms(data.rooms);
    }
  }

  function updateForm(field: string, value: string | boolean) {
    if (field === "name" && typeof value === "string") {
      const slug = value
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
      setForm((prev) => ({ ...prev, [field]: value, slug }));
    } else {
      setForm((prev) => ({ ...prev, [field]: value }));
    }
  }

  function updateRoom(index: number, field: keyof Room, value: string | number) {
    setRooms((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)),
    );
  }

  function addRoom() {
    setRooms((prev) => [...prev, { name: "", area: 0 }]);
  }

  function removeRoom(index: number) {
    setRooms((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const validRooms = rooms.filter((r) => r.name.trim());
      const validImages = images.filter((i) => i.trim());
      const validDistPlans = distributionPlans.filter((i) => i.trim());

      if (validRooms.length === 0) {
        setError("Ajoute au moins une piece au plan.");
        return;
      }

      if (!form.thumbnail.trim()) {
        setError("Ajoute une vignette avant d'enregistrer le plan.");
        return;
      }

      const expectedDistributionPlans = form.category === "duplex" ? 2 : 1;
      if (validDistPlans.length < expectedDistributionPlans) {
        setError(
          form.category === "duplex"
            ? "Ajoute les 2 plans de distribution requis pour un duplex."
            : "Ajoute le plan de distribution requis.",
        );
        return;
      }

      const payload = {
        ...form,
        surface: Number(form.surface),
        bedrooms: Number(form.bedrooms),
        bathrooms: Number(form.bathrooms),
        floors: Number(form.floors),
        estimatedCost: Number(form.estimatedCost),
        rooms: validRooms,
        images: validImages,
        distributionPlans: validDistPlans,
      };

      const url =
        mode === "create"
          ? "/api/admin/plans"
          : `/api/admin/plans/${planId}`;
      const method = mode === "create" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json().catch(() => ({}))) as { error?: string };

      if (!res.ok) {
        setError(data.error || "Erreur lors de l'enregistrement");
        return;
      }

      router.push("/admin/plans");
      router.refresh();
    } catch (error) {
      console.error("Plan form submission failed:", error);
      setError("Erreur reseau lors de l'enregistrement du plan.");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full px-3 py-2 border-2 border-outline text-sm focus:outline-none focus:border-primary";

  const previewRooms = groupProcessedRooms(rooms.filter(r => r.name.trim()));

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 text-red-700 text-sm px-4 py-3 border-2 border-red-700 font-semibold">
          {error}
        </div>
      )}

      {mode === "create" && (
        <AIPlanImporter onExtracted={handleAIExtracted} />
      )}

      <div className="bg-white border-2 border-outline p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Informations générales</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom du plan
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => updateForm("name", e.target.value)}
              required
              className={inputClass}
              placeholder="Villa Familiale"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Slug (URL)
            </label>
            <input
              type="text"
              value={form.slug}
              onChange={(e) => updateForm("slug", e.target.value)}
              required
              className={inputClass}
              placeholder="villa-familiale"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Catégorie
            </label>
            <select
              value={form.category}
              onChange={(e) => updateForm("category", e.target.value)}
              className={inputClass}
            >
              <option value="villa">Villa</option>
              <option value="duplex">Duplex</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Surface (m²)
            </label>
            <input
              type="number"
              value={form.surface}
              onChange={(e) => updateForm("surface", e.target.value)}
              required
              min={1}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={form.description}
            onChange={(e) => updateForm("description", e.target.value)}
            required
            rows={3}
            className={`${inputClass} resize-none`}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Chambres
            </label>
            <input
              type="number"
              value={form.bedrooms}
              onChange={(e) => updateForm("bedrooms", e.target.value)}
              required
              min={0}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Salles de bain
            </label>
            <input
              type="number"
              value={form.bathrooms}
              onChange={(e) => updateForm("bathrooms", e.target.value)}
              required
              min={0}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Niveaux
            </label>
            <input
              type="number"
              value={form.floors}
              onChange={(e) => updateForm("floors", e.target.value)}
              required
              min={1}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      <div className="bg-white border-2 border-outline p-6 space-y-5">
        <h2 className="font-semibold text-gray-900">Médias</h2>

        <ThumbnailUploader
          value={form.thumbnail}
          onChange={(url) => updateForm("thumbnail", url)}
        />

        <ImageUploader
          value={images}
          onChange={setImages}
          maxFiles={10}
          label="Galerie d'images"
        />
      </div>

      <div className="bg-white border-2 border-outline p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Composition des pièces</h2>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700">Édition</h3>
            {rooms.map((room, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="text"
                  value={room.name}
                  onChange={(e) => updateRoom(i, "name", e.target.value)}
                  placeholder="Nom de la pièce"
                  className={`flex-1 ${inputClass}`}
                />
                <input
                  type="number"
                  value={room.area || ""}
                  onChange={(e) => updateRoom(i, "area", Number(e.target.value))}
                  placeholder="m²"
                  min={0}
                  className={`w-24 ${inputClass}`}
                />
                {rooms.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRoom(i)}
                    className="text-red-400 hover:text-red-600 px-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addRoom}
              className="text-sm text-primary hover:underline"
            >
              + Ajouter une pièce
            </button>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700">Aperçu (Frontend)</h3>
            <div className="border-2 border-outline/30 rounded-lg p-4 bg-surface/50">
              <h4 className="text-lg font-semibold text-foreground mb-3 tracking-tight">
                Composition des pièces
              </h4>
              <ul className="space-y-2 list-disc list-inside">
                {previewRooms.map((item, i) => (
                  <li key={i} className="text-foreground/70">
                    {item.count > 1 ? `${item.label} (${item.count})` : item.label}
                  </li>
                ))}
                {previewRooms.length === 0 && (
                  <li className="text-gray-400 italic">Aucune pièce définie</li>
                )}
              </ul>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Les pièces sont nettoyées (RDC, ETAGE, chiffres) et groupées (chambres, salles de bain)
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white border-2 border-outline p-6 space-y-3">
        <h2 className="font-semibold text-gray-900">Devis estimatif</h2>
        <p className="text-sm text-gray-500">
          Le tableau est genere automatiquement avec la surface du plan et le prix au m2 defini dans les reglages.
        </p>

        <div className="flex items-end gap-4 pt-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(e) => updateForm("featured", e.target.checked)}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm text-gray-700">Mis en avant</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.published}
              onChange={(e) => updateForm("published", e.target.checked)}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm text-gray-700">Publie</span>
          </label>
        </div>
      </div>

      <div className="bg-white border-2 border-outline p-6 space-y-5">
        <div>
          <h2 className="font-semibold text-gray-900">Plans de distribution</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {form.category === "duplex"
              ? "2 images requises (RDC + Étage)"
              : "1 image requise"}
          </p>
        </div>

        <ImageUploader
          value={distributionPlans}
          onChange={setDistributionPlans}
          maxFiles={form.category === "duplex" ? 2 : 1}
          label="Plans de distribution"
        />
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 bg-primary text-white text-sm font-bold border-2 border-primary hover:bg-primary-dark transition-colors disabled:opacity-50"
        >
          {loading
            ? mode === "create"
              ? "Création..."
              : "Enregistrement..."
            : mode === "create"
              ? "Créer le plan"
              : "Enregistrer"}
        </button>
        <Link
          href="/admin/plans"
          className="px-6 py-2.5 bg-white text-foreground text-sm font-bold border-2 border-outline hover:bg-surface transition-colors"
        >
          Annuler
        </Link>
      </div>
    </form>
  );
}
