import { timingSafeEqual } from "@/lib/crypto";
import { getEnv } from "@/lib/env";
import { TOOLS, ToolContent } from "@/lib/mcp/tools";

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
  "3) ajouter les rendus 3D (role=render : publics, le premier devient la couverture) puis les distributions cotées (role=floor_plan : privées, réservées aux membres Premium, PDF accepté). " +
  "Fichiers sur l'ordinateur du propriétaire : create_upload_link — sur claude.ai, lui donner le lien de la page où il dépose ses fichiers puis attendre qu'il confirme ; avec Claude Code, envoyer chaque fichier local avec la commande curl fournie (jamais en base64). " +
  "Fichiers accessibles par une URL https directe : upload_plan_image ; " +
  "4) get_plan pour vérifier tous les champs, y compris Premium ; 5) présenter au propriétaire un résumé (référence, nom, surfaces, pièces, devis, budget, images) et les avertissements éventuels ; " +
  "6) publier (update_plan_content avec status=published) uniquement après son accord explicite. " +
  "Fichiers réservés à l'espace Premium (distributions cotées, catalogue PDF) : list_premium_files puis get_premium_file pour les regarder ou les télécharger (lien temporaire, à ne jamais transmettre à un client). " +
  "Dossier local de plusieurs modèles (agent avec accès aux fichiers : Cowork, Claude Code) : en général un sous-dossier par modèle contenant le PDF et les images. " +
  "Commencer par list_plans pour écarter les références déjà au catalogue, puis traiter les modèles un par un : lire le PDF, create_plan, create_upload_link, " +
  "puis envoyer chaque image avec la commande curl fournie (curl -T, jamais de base64) : les rendus d'abord, la plus belle vue de façade en premier (couverture), puis les distributions dans l'ordre des niveaux. " +
  "Classer chaque fichier en regardant l'image (rendu 3D ou plan coté) et son nom ; en cas de doute, demander. Ignorer les fichiers sans rapport (vidéos, fichiers de travail). " +
  "Si curl est bloqué par le réseau de l'agent, donner au propriétaire le lien « page » à la place. " +
  "À la fin, présenter un tableau récapitulatif (référence, nom, chambres, surface, budget, nombre de rendus et de distributions, avertissements, éléments manquants) et ne publier que les modèles que le propriétaire valide. " +
  "Conventions : référence en majuscules « V4-001 » (V = villa, D = duplex, chiffre = nombre de chambres), slug généré « villa-v4-001 », nom « Villa V4-001 » ou « Duplex D5-002 » ; " +
  "surfaces en m², dimensions en m, montants entiers en FCFA (XAF, sans séparateur ni unité). N'inventez aucune valeur absente du PDF : laissez le champ vide et signalez-le. " +
  "Analyse du comportement des visiteurs (où ils cliquent, bloquent, jusqu'où ils lisent, ce qui les frustre) : les données détaillées sont dans PostHog (serveur MCP officiel PostHog, projet wooplans.com, région UE), " +
  "les chiffres de vente font foi ici (get_business_summary, list_sales). Événements PostHog : $pageview (propriétés page_type = vitrine | catalogue | fiche_modele | page_vente | demande_plans | contenu, plan = slug du modèle), " +
  "cta_click (cta_id ; suffixe @a/@b = variante A/B de la page de vente), checkout_open (ouverture du paiement, mode widget ou redirect), purchase_success (paiement confirmé, envoyé par le serveur), " +
  "plan_request_submit, whatsapp_click, promo_popup_view/click/dismiss, catalogue_filter (filtre du catalogue appliqué : control, categorie, budget, chambres, results), $rageclick, $dead_click, $pageleave (défilement : $prev_pageview_max_scroll_percentage). " +
  "Propriétés de provenance : wp_source (social_ads, social, search, search_ads, email, referral, direct…) et wp_campaign (utm_campaign), identiques à celles du tableau de bord /admin ; variant sur la page de vente. " +
  "Les visiteurs européens sans accord et les pages privées (/admin, /espace-premium, /connexion, /merci) ne sont pas mesurés : les volumes PostHog sont donc inférieurs à ceux du suivi first-party, comparez des taux, pas des totaux. " +
  "Méthode : 1) préciser la période (7 ou 30 jours par défaut) ; 2) tunnel page_vente → cta_click → checkout_open → purchase_success, ventilé par appareil ($device_type), wp_source, wp_campaign et variant, pour trouver l'étape qui perd le plus ; " +
  "3) sur les pages et segments concernés : clics de rage et clics morts (élément visé, texte), profondeur de défilement, temps passé, sorties ; cartes de chaleur de /catalogue-premium et des fiches modèle ; " +
  "4) relier frictions et abandons (ex. clics morts sur un visuel non cliquable, abandon après ouverture du paiement sur mobile Android) en vous appuyant sur des chiffres, échantillons de taille indiquée ; " +
  "5) recommandations priorisées dans un tableau : problème observé, preuve chiffrée, recommandation concrète, impact attendu (élevé/moyen/faible), effort (faible/moyen/élevé), en commençant par impact élevé et effort faible ; " +
  "6) pour chaque problème, 2 à 5 liens vers des enregistrements PostHog précis (sessions avec clic de rage, abandon après checkout_open…) que le propriétaire peut regarder. " +
  "Ne concluez pas sur moins de 30 visiteurs par segment : dites-le et proposez d'attendre ou d'élargir la période.";

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
        if (output instanceof ToolContent) {
          return rpcResult(id, {
            content: [{ type: "text", text: JSON.stringify(output.structured, null, 2) }, ...output.content],
            structuredContent: output.structured,
            isError: false,
          });
        }
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
