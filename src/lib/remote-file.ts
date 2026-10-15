import { checkDownloadUrl, sniffFileType, type SniffedType } from "@/lib/plan-input";

export type IncomingFile = { body: ReadableStream | Uint8Array; size: number; type: SniffedType | null };

const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 20_000;
const HEAD_BYTES = 16;

/**
 * Télécharge un fichier https pour le stocker dans R2 sans le garder en mémoire quand sa taille est annoncée :
 * on lit seulement les premiers octets (type réel), puis le reste est retransmis via un FixedLengthStream,
 * qui coupe le transfert si la taille réelle diffère de la taille annoncée. Sans taille fiable
 * (pas de Content-Length, réponse compressée), le fichier est lu en mémoire dans la limite maxBytes.
 */
export async function downloadFile(rawUrl: string, maxBytes: number): Promise<IncomingFile> {
  let url = checkDownloadUrl(rawUrl);
  let res: Response | null = null;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    res = await fetch(url, {
      redirect: "manual",
      headers: { accept: "image/png,image/jpeg,image/webp,application/pdf;q=0.9,*/*;q=0.5", "user-agent": "WOOPLANS-agent/1.0" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const location = res.status >= 300 && res.status < 400 ? res.headers.get("location") : null;
    if (!location) break;
    await res.body?.cancel();
    if (hop === MAX_REDIRECTS) throw new Error("Trop de redirections");
    url = checkDownloadUrl(new URL(location, url).toString());
  }
  if (!res || !res.ok || !res.body) throw new Error(`Téléchargement impossible (HTTP ${res?.status ?? "?"})`);

  const encoding = (res.headers.get("content-encoding") || "identity").toLowerCase();
  const declared = Number(res.headers.get("content-length"));
  const knownSize = encoding === "identity" && Number.isInteger(declared) && declared > 0 ? declared : null;
  if (knownSize !== null && knownSize > maxBytes) {
    await res.body.cancel();
    throw new Error(`Fichier trop lourd : ${(knownSize / 1048576).toFixed(1)} Mo (max ${maxBytes / 1048576} Mo)`);
  }

  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  const readChunk = async () => {
    const { done, value } = await reader.read();
    if (done) return false;
    received += value.byteLength;
    if (received > maxBytes) {
      await reader.cancel();
      throw new Error(`Fichier trop lourd (max ${maxBytes / 1048576} Mo)`);
    }
    chunks.push(value);
    return true;
  };
  while (received < HEAD_BYTES && (await readChunk()));
  const type = sniffFileType(concat(chunks, Math.min(received, HEAD_BYTES)));
  if (!type) {
    await reader.cancel();
    return { body: new Uint8Array(), size: received, type: null };
  }

  if (knownSize !== null) {
    const head = [...chunks];
    const replay = new ReadableStream<Uint8Array>({
      async pull(controller) {
        const next = head.shift();
        if (next) return controller.enqueue(next);
        const { done, value } = await reader.read();
        if (done) controller.close();
        else controller.enqueue(value);
      },
      cancel: (reason) => reader.cancel(reason),
    });
    const fixed = new FixedLengthStream(knownSize);
    void replay.pipeTo(fixed.writable).catch(() => {});
    return { body: fixed.readable, size: knownSize, type };
  }

  while (await readChunk());
  return { body: concat(chunks, received), size: received, type };
}

function concat(chunks: Uint8Array[], length: number) {
  const out = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    if (offset >= length) break;
    const part = chunk.subarray(0, length - offset);
    out.set(part, offset);
    offset += part.byteLength;
  }
  return out;
}
