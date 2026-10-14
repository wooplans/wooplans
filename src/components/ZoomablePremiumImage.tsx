"use client";

import Image from "next/image";
import { useState } from "react";

type ZoomablePremiumImageProps = {
  src: string;
  alt: string;
};

export function ZoomablePremiumImage({ src, alt }: ZoomablePremiumImageProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block w-full cursor-zoom-in bg-transparent p-0 text-left"
        aria-label={`Agrandir ${alt}`}
      >
        <Image
          unoptimized
          src={src}
          alt={alt}
          width={1800}
          height={1200}
          sizes="(min-width: 768px) 896px, 100vw"
          quality={80}
          className="h-auto w-full object-contain"
        />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex cursor-zoom-out items-center justify-center bg-black/95 p-4"
          onClick={() => setOpen(false)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 text-3xl leading-none text-white/80 hover:text-white"
            onClick={() => setOpen(false)}
            aria-label="Fermer"
          >
            &times;
          </button>
          <div
            className="relative h-[90vh] w-[94vw]"
            onClick={(event) => event.stopPropagation()}
          >
            <Image
              unoptimized
              src={src}
              alt={alt}
              fill
              sizes="94vw"
              quality={95}
              className="object-contain"
            />
          </div>
        </div>
      )}
    </>
  );
}
