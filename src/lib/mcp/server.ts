import { timingSafeEqual } from "@/lib/crypto";
import { getEnv } from "@/lib/env";
import { TOOLS } from "@/lib/mcp/tools";

/**
 * Serveur MCP « Streamable HTTP » sans état (réponses JSON) pour piloter WOOPLANS
 * depuis un agent (Claude, etc.). Authentification par jeton secret MCP_TOKEN.
 */
const SERVER_INFO = { name: "wooplans", title: "WOOPLANS", version: "1.0.0" };
const SUPPORTED_VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"];
const INSTRUCTIONS =
  "Outils de pilotage de WOOPLANS (catalogue de plans de maisons, Afrique francophone). Montants en FCFA (XAF). " +
  "Le tunnel : vitrine → page de vente /catalogue-premium → achat du Catalogue Premium (39 000 FCFA, Chariow) → membre Premium → demande de plans complets (CRM). " +
  "Le revenu du catalogue (ventes Chariow) est distinct des encaissements des plans complets (CRM). " +
  "Avant toute action qui écrit à un client (send_lead_email, grant_premium_access, send_new_access_code) ou qui révoque un accès, confirmez avec le propriétaire. " +
  "Ajout d'un modèle au catalogue : 1) lire le PDF fourni (descriptif, surfaces, pièces, devis) ; 2) create_plan — la fiche est toujours créée en brouillon ; " +
  "3) upload_plan_image avec role=render pour les rendus 3D (publics, le premier devient la couverture), puis role=floor_plan pour les distributions cotées (privées, réservées aux membres Premium, PDF accepté) ; " +
  "4) get_plan pour vérifier tous les champs, y compris Premium ; 5) présenter au propriétaire un résumé (référence, nom, surfaces, pièces, devis, budget, images) et les avertissements éventuels ; " +
  "6) publier (update_plan_content avec status=published) uniquement après son accord explicite. " +
  "Conventions : référence en majuscules « V4-001 » (V = villa, D = duplex, chiffre = nombre de chambres), slug généré « villa-v4-001 », nom « Villa V4-001 » ou « Duplex D5-002 » ; " +
  "surfaces en m², dimensions en m, montants entiers en FCFA (XAF, sans séparateur ni unité). N'inventez aucune valeur absente du PDF : laissez le champ vide et signalez-le.";

type RpcRequest = { jsonrpc: "2.0"; id?: string | number | null; method: string; params?: Record<string, unknown> };

const rpcResult = (id: RpcRequest["id"], result: unknown) => ({ jsonrpc: "2.0", id: id ?? null, result });
const rpcError = (id: RpcRequest["id"], code: number, message: string) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });

export function isAuthorized(request: Request, pathToken?: string) {
  const expected = getEnv().MCP_TOKEN;
  if (!expected || expected.length < 24) return false;
  const header = request.headers.get("authorization") || "";
  const provided = pathToken || (header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "");
  return Boolean(provided) && timingSafeEqual(provided, expected);
}

async function handle(message: RpcRequest) {
  const { id, method, params = {} } = message;
  switch (method) {
    case "initialize": {
      const requested = typeof params.protocolVersion === "string" ? params.protocolVersion : SUPPORTED_VERSIONS[0];
      return rpcResult(id, {
        protocolVersion: SUPPORTED_VERSIONS.includes(requested) ? requested : SUPPORTED_VERSIONS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions: INSTRUCTIONS,
      });
    }
    case "ping":
      return rpcResult(id, {});
    case "tools/list":
      return rpcResult(id, {
        tools: TOOLS.map(({ name, description, inputSchema, annotations }) => ({ name, description, inputSchema, annotations })),
      });
    case "tools/call": {
      const tool = TOOLS.find((t) => t.name === params.name);
      if (!tool) return rpcError(id, -32602, `Outil inconnu : ${String(params.name)}`);
      try {
        const output = await tool.handler((params.arguments as Record<string, unknown>) ?? {});
        return rpcResult(id, {
          content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
          structuredContent: Array.isArray(output) ? { items: output } : (output as Record<string, unknown>),
          isError: false,
        });
      } catch (error) {
        return rpcResult(id, {
          content: [{ type: "text", text: error instanceof Error ? error.message : String(error) }],
          isError: true,
        });
      }
    }
    default:
      return rpcError(id, -32601, `Méthode non prise en charge : ${method}`);
  }
}

export async function handleMcpRequest(request: Request, pathToken?: string) {
  if (!isAuthorized(request, pathToken)) {
    // URL à jeton invalide : 404 sans « WWW-Authenticate », sinon les connecteurs (claude.ai)
    // tentent une connexion OAuth inexistante et affichent une erreur trompeuse.
    if (pathToken !== undefined) return new Response("Introuvable", { status: 404 });
    return Response.json(rpcError(null, -32001, "Non autorisé"), {
      status: 401,
      headers: { "WWW-Authenticate": 'Bearer realm="wooplans-mcp"' },
    });
  }
  if (request.method === "GET") {
    // Pas de flux SSE côté serveur : le client utilise uniquement POST.
    return new Response(null, { status: 405, headers: { Allow: "POST" } });
  }
  if (request.method === "DELETE") return new Response(null, { status: 204 });

  let body: RpcRequest | RpcRequest[];
  try {
    body = (await request.json()) as RpcRequest | RpcRequest[];
  } catch {
    return Response.json(rpcError(null, -32700, "JSON invalide"), { status: 400 });
  }
  const messages = Array.isArray(body) ? body : [body];
  const responses = [];
  for (const message of messages) {
    if (!message || message.jsonrpc !== "2.0" || typeof message.method !== "string") {
      responses.push(rpcError(null, -32600, "Requête invalide"));
      continue;
    }
    // Les notifications (sans id) n'appellent pas de réponse.
    if (message.id === undefined || message.id === null) continue;
    responses.push(await handle(message));
  }
  if (responses.length === 0) return new Response(null, { status: 202 });
  return Response.json(Array.isArray(body) ? responses : responses[0], { headers: { "Cache-Control": "no-store" } });
}
