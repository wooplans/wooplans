"use client";

import Image from "next/image";
import { useState, useRef, useCallback } from "react";

type UploadedFile = {
  url: string;
  filename: string;
  originalName: string;
};

type UploadFilesResponse = {
  files: UploadedFile[];
};

type UploadErrorResponse = {
  error?: string;
};

type UploadingFile = {
  file: File;
  progress: number;
  previewUrl: string;
  error?: string;
};

type ImageUploaderProps = {
  value: string[];
  onChange: (urls: string[]) => void;
  maxFiles?: number;
  label?: string;
};

type CompressionSettings = {
  maxWidth: number;
  maxHeight: number;
  quality: number;
};

function getBaseName(filename: string) {
  const dotIndex = filename.lastIndexOf(".");
  return dotIndex > 0 ? filename.slice(0, dotIndex) : filename;
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Impossible de lire l'image"));
    img.src = url;
  });
}

async function compressImageForUpload(file: File, settings: CompressionSettings) {
  if (!file.type.startsWith("image/") || file.type === "image/gif") {
    return file;
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(objectUrl);
    const ratio = Math.min(
      1,
      settings.maxWidth / image.naturalWidth,
      settings.maxHeight / image.naturalHeight,
    );
    const width = Math.max(1, Math.round(image.naturalWidth * ratio));
    const height = Math.max(1, Math.round(image.naturalHeight * ratio));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) return file;

    context.drawImage(image, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/webp", settings.quality);
    });

    if (!blob || blob.size >= file.size) {
      return file;
    }

    return new File([blob], `${getBaseName(file.name)}.webp`, {
      type: "image/webp",
      lastModified: Date.now(),
    });
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function ImageUploader({
  value,
  onChange,
  maxFiles = 10,
  label = "Images",
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState<UploadingFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const totalFiles = value.length + uploading.length;
  const uploadFiles = useCallback(
    async (files: File[]) => {
      const compressionSettings =
        label.toLowerCase().includes("distribution")
          ? { maxWidth: 1800, maxHeight: 1800, quality: 0.78 }
          : { maxWidth: 1400, maxHeight: 1100, quality: 0.72 };
      const remaining = maxFiles - value.length;
      const toUpload = files.slice(0, remaining);

      if (toUpload.length < files.length) {
        alert(`Maximum ${maxFiles} images. ${files.length - toUpload.length} fichier(s) ignoré(s).`);
      }

      const newUploading: UploadingFile[] = toUpload.map((file) => ({
        file,
        progress: 0,
        previewUrl: URL.createObjectURL(file),
      }));

      setUploading((prev) => [...prev, ...newUploading]);

      const accumulatedUrls: string[] = [];

      for (let i = 0; i < toUpload.length; i++) {
        const file = toUpload[i];
        const optimizedFile = await compressImageForUpload(file, compressionSettings);
        const formData = new FormData();
        formData.append("files", optimizedFile);

        try {
          const res = await fetch("/api/admin/upload", {
            method: "POST",
            body: formData,
          });

          if (!res.ok) {
            const data = (await res.json()) as UploadErrorResponse;
            throw new Error(data.error || "Upload failed");
          }

          const data = (await res.json()) as UploadFilesResponse;

          setUploading((prev) =>
            prev.map((u) =>
              u.file === file ? { ...u, progress: 100 } : u,
            ),
          );

          const urls = data.files.map((f) => f.url);
          accumulatedUrls.push(...urls);
          onChange([...value, ...accumulatedUrls]);
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Erreur lors de l'upload";
          setUploading((prev) =>
            prev.map((u) =>
              u.file === file ? { ...u, error: message, progress: -1 } : u,
            ),
          );
        }
      }

      setTimeout(() => {
        setUploading((prev) => {
          prev.forEach((u) => URL.revokeObjectURL(u.previewUrl));
          return prev.filter((u) => u.progress !== 100 && u.progress !== -1);
        });
      }, 1000);
    },
    [value, onChange, maxFiles, label],
  );

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) uploadFiles(files);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith("image/"),
    );
    if (files.length > 0) uploadFiles(files);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
  }

  function removeImage(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function removeUploading(file: File) {
    setUploading((prev) => {
      const target = prev.find((u) => u.file === file);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((u) => u.file !== file);
    });
  }

  function moveImage(fromIndex: number, direction: -1 | 1) {
    const toIndex = fromIndex + direction;
    if (toIndex < 0 || toIndex >= value.length) return;
    const next = [...value];
    [next[fromIndex], next[toIndex]] = [next[toIndex], next[fromIndex]];
    onChange(next);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          {label}
          <span className="text-gray-400 font-normal ml-1">
            ({value.length}/{maxFiles})
          </span>
        </label>
      </div>

      {(value.length > 0 || uploading.length > 0) && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {value.map((url, i) => (
            <div key={url} className="group relative aspect-square overflow-hidden border-2 border-outline bg-surface">
              <Image
                src={url}
                alt={`Image ${i + 1}`}
                width={320}
                height={320}
                sizes="(min-width: 768px) 20vw, 33vw"
                quality={45}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-black/60 text-white text-[10px] font-bold">
                {i + 1}
              </div>
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />

              <div className="absolute top-1 right-1 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                {i > 0 && (
                  <button
                    type="button"
                    onClick={() => moveImage(i, -1)}
                    className="w-5 h-5 bg-white/90 rounded text-gray-600 hover:bg-white flex items-center justify-center text-xs"
                    title="Déplacer à gauche"
                  >
                    &#8592;
                  </button>
                )}
                {i < value.length - 1 && (
                  <button
                    type="button"
                    onClick={() => moveImage(i, 1)}
                    className="w-5 h-5 bg-white/90 text-gray-600 hover:bg-white flex items-center justify-center text-xs"
                    title="Déplacer à droite"
                  >
                    &#8594;
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                    className="w-5 h-5 bg-red-500/90 text-white hover:bg-red-600 flex items-center justify-center text-xs"
                  title="Supprimer"
                >
                  &#10005;
                </button>
              </div>
            </div>
          ))}

          {uploading.map((u) => (
            <div
              key={`${u.file.name}-${u.file.lastModified}`}
              className="relative aspect-square overflow-hidden border-2 border-outline bg-surface"
            >
              {u.file.type.startsWith("image/") && (
                <Image
                  src={u.previewUrl}
                  alt=""
                  width={320}
                  height={320}
                  unoptimized
                  className="w-full h-full object-cover opacity-40"
                />
              )}
              <div className="absolute inset-0 flex items-center justify-center">
                {u.progress >= 0 && u.progress < 100 && (
                  <div className="text-center">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-[10px] text-gray-500 mt-1">{u.progress}%</p>
                  </div>
                )}
                {u.progress === 100 && (
                  <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {u.error && (
                  <button
                    type="button"
                    onClick={() => removeUploading(u.file)}
                    className="text-red-500 text-xs hover:underline cursor-pointer"
                  >
                    Erreur
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {totalFiles < maxFiles && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => inputRef.current?.click()}
          className={`relative border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${
            dragOver
              ? "border-primary bg-primary/5"
              : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />
          <svg
            className="w-8 h-8 text-gray-300 mx-auto mb-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="text-sm text-gray-500">
            <span className="font-medium text-primary">Cliquer ou glisser</span> pour ajouter des images
          </p>
          <p className="text-xs text-gray-400 mt-1">
            JPG, PNG, WebP, GIF — Max 10 Mo par fichier
          </p>
        </div>
      )}
    </div>
  );
}

export function ThumbnailUploader({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(
    async (file: File) => {
      setUploading(true);
      const optimizedFile = await compressImageForUpload(file, {
        maxWidth: 960,
        maxHeight: 720,
        quality: 0.68,
      });
      const formData = new FormData();
      formData.append("files", optimizedFile);

      try {
        const res = await fetch("/api/admin/upload", {
          method: "POST",
          body: formData,
        });
        if (!res.ok) {
          const data = (await res.json()) as UploadErrorResponse;
          throw new Error(data.error || "Upload failed");
        }
        const data = (await res.json()) as UploadFilesResponse;
        onChange(data.files[0].url);
      } catch (err) {
        alert(err instanceof Error ? err.message : "Erreur lors de l'upload");
      } finally {
        setUploading(false);
      }
    },
    [onChange],
  );

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = Array.from(e.dataTransfer.files).find((f) =>
      f.type.startsWith("image/"),
    );
    if (file) uploadFile(file);
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">Vignette</label>

      <div className="flex gap-4 items-start">
        {value && (
          <div className="relative w-32 h-24 overflow-hidden border-2 border-outline bg-surface shrink-0 group">
            <Image
              src={value}
              alt="Vignette"
              width={128}
              height={96}
              sizes="128px"
              quality={45}
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={() => onChange("")}
              className="absolute top-1 right-1 w-5 h-5 bg-red-500/90 text-white hover:bg-red-600 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
            >
              &#10005;
            </button>
          </div>
        )}

        <div className="flex-1 space-y-2">
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed p-4 text-center cursor-pointer transition-colors ${
              dragOver
                ? "border-primary bg-primary/5"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleFileChange}
              className="hidden"
            />
            {uploading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-gray-500">Envoi en cours...</span>
              </div>
            ) : (
              <p className="text-xs text-gray-500">
                <span className="font-medium text-primary">Cliquer ou glisser</span> une image
              </p>
            )}
          </div>


        </div>
      </div>
    </div>
  );
}
