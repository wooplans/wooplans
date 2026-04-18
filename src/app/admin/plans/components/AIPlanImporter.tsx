"use client";

import { useState, useRef, useCallback } from "react";

type Room = { name: string; area: number };

type ExtractedData = {
  name: string;
  category: string;
  description: string;
  surface: number;
  bedrooms: number;
  bathrooms: number;
  floors: number;
  rooms: Room[];
  estimatedCost: number;
};

type AIPlanImporterProps = {
  onExtracted: (data: ExtractedData) => void;
};

export function AIPlanImporter({ onExtracted }: AIPlanImporterProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const extractFromPDF = useCallback(
    async (file: File) => {
      setLoading(true);
      setError("");
      setFileName(file.name);

      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch("/api/admin/ai/extract-plan", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Erreur lors de l'extraction");
        }

        const data: ExtractedData = await res.json();
        onExtracted(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur inconnue");
      } finally {
        setLoading(false);
      }
    },
    [onExtracted],
  );

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) extractFromPDF(file);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = Array.from(e.dataTransfer.files).find(
      (f) => f.type === "application/pdf",
    );
    if (file) {
      extractFromPDF(file);
    } else {
      setError("Veuillez déposer un fichier PDF");
    }
  }

  return (
    <div className="bg-white border-2 border-primary/30 p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/10 flex items-center justify-center">
          <svg
            className="w-5 h-5 text-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
        </div>
        <div>
          <h2 className="font-semibold text-gray-900">
            Import IA — Remplissage automatique
          </h2>
          <p className="text-xs text-gray-500">
            Importez le PDF du plan et l&apos;IA remplira les champs automatiquement.
            Vous pourrez ensuite réviser et ajuster.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm px-4 py-3 border-2 border-red-700 font-semibold">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-3 py-2">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-600">
            Analyse du PDF en cours
            {fileName ? ` (${fileName})` : ""}...
          </span>
        </div>
      )}

      {!loading && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setDragOver(false);
          }}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${
            dragOver
              ? "border-primary bg-primary/5"
              : "border-gray-200 hover:border-primary/50 hover:bg-primary/5"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />
          <svg
            className="w-8 h-8 text-primary/60 mx-auto mb-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <p className="text-sm text-gray-600">
            <span className="font-medium text-primary">
              Cliquer ou glisser un PDF
            </span>{" "}
            pour analyser le plan
          </p>
          <p className="text-xs text-gray-400 mt-1">PDF — Max 20 Mo</p>
        </div>
      )}
    </div>
  );
}
