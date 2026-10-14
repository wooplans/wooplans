type FeatureRow = {
  label: string;
  free: boolean;
  premium: boolean;
};

const features: FeatureRow[] = [
  { label: "Catalogue de plans", free: true, premium: true },
  { label: "Photos et descriptions", free: true, premium: true },
  { label: "Prix estimé total", free: true, premium: true },
  { label: "Plans de distribution HD", free: false, premium: true },
  { label: "Devis détaillé par poste", free: false, premium: true },
  { label: "Guide de sélection des modèles", free: false, premium: true },
  { label: "Assistance pour accéder au catalogue", free: false, premium: true },
  { label: "Nouveaux modèles inclus", free: false, premium: true },
];

export function PricingComparison() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-surface border border-outline/10 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-3 text-sm">
          {/* Header */}
          <div className="px-5 py-4 border-b border-outline/10 font-semibold text-foreground/70">
            Fonctionnalité
          </div>
          <div className="px-5 py-4 border-b border-outline/10 text-center font-semibold text-foreground/70">
            Gratuit
          </div>
          <div className="px-5 py-4 border-b border-outline/10 text-center font-semibold text-accent bg-accent/5">
            Premium
          </div>

          {/* Rows */}
          {features.map((f, i) => (
            <div key={i} className="contents">
              <div className="px-5 py-3.5 border-b border-outline/10 text-sm text-foreground/80">
                {f.label}
              </div>
              <div className="px-5 py-3.5 border-b border-outline/10 flex items-center justify-center">
                {f.free ? (
                  <svg
                    className="w-5 h-5 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="square"
                      strokeLinejoin="miter"
                      strokeWidth={2.5}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-4 h-4 text-foreground/20"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="square"
                      strokeLinejoin="miter"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                )}
              </div>
              <div className="px-5 py-3.5 border-b border-outline/10 flex items-center justify-center bg-accent/5">
                <svg
                  className="w-5 h-5 text-accent"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="square"
                    strokeLinejoin="miter"
                    strokeWidth={2.5}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
