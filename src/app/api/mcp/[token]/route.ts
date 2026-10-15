import { handleMcpRequest } from "@/lib/mcp/server";

/**
 * Variante avec le jeton dans l'URL, pour les clients qui ne permettent pas
 * d'ajouter un en-tête (connecteurs personnalisés). Gardez cette URL secrète.
 */
type Ctx = { params: Promise<{ token: string }> };
export const POST = async (request: Request, { params }: Ctx) => handleMcpRequest(request, (await params).token);
export const GET = async (request: Request, { params }: Ctx) => handleMcpRequest(request, (await params).token);
export const DELETE = async (request: Request, { params }: Ctx) => handleMcpRequest(request, (await params).token);
