/** Squelette affiché instantanément pendant le chargement d'un onglet de l'admin. */
export default function AdminLoading() {
  const bar = "animate-pulse rounded-lg bg-outline/70";
  return (
    <div aria-busy="true" aria-label="Chargement">
      <div className={`${bar} h-7 w-56`} />
      <div className={`${bar} mt-2 h-4 w-80 max-w-full`} />
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="card space-y-2 p-4">
            <div className={`${bar} h-3 w-20`} />
            <div className={`${bar} h-6 w-24`} />
          </div>
        ))}
      </div>
      <div className="card mt-6 space-y-3 p-5">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className={`${bar} h-4`} style={{ width: `${90 - (i % 3) * 15}%` }} />
        ))}
      </div>
    </div>
  );
}
