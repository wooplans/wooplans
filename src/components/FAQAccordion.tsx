"use client";

import { useState } from "react";

type FAQItem = {
  question: string;
  answer: React.ReactNode;
};

type FAQAccordionProps = {
  items: FAQItem[];
};

export function FAQAccordion({ items }: FAQAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      {items.map((faq, i) => {
        const isOpen = openIndex === i;
        return (
          <div
            key={i}
            className="bg-background border border-outline/10 rounded-2xl overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : i)}
              className="flex items-center justify-between w-full px-6 py-5 text-left"
            >
              <span className="font-semibold text-foreground pr-4">
                {faq.question}
              </span>
              <svg
                className={`w-5 h-5 text-foreground/40 shrink-0 transition-transform duration-200 ${
                  isOpen ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="square"
                  strokeLinejoin="miter"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            <div
              className={`px-6 overflow-hidden transition-all duration-200 ${
                isOpen ? "pb-5 max-h-96" : "max-h-0"
              }`}
            >
              <div className="text-sm text-foreground/60 leading-relaxed">
                {faq.answer}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
