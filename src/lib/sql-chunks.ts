/**
 * D1 accepte au plus 100 paramètres par requête : une liste d'adresses ou d'identifiants plus longue
 * (ex. 300 prospects affichés d'un coup) fait échouer la requête et la page. On la traite par lots.
 */
export async function inChunks<V, T>(values: readonly V[], run: (chunk: V[]) => Promise<T[]>, size = 50): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < values.length; i += size) out.push(...(await run(values.slice(i, i + size))));
  return out;
}
