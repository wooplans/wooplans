import { handleMcpRequest } from "@/lib/mcp/server";

/** Point d'entrée MCP : en-tête « Authorization: Bearer <MCP_TOKEN> ». */
export const POST = (request: Request) => handleMcpRequest(request);
export const GET = (request: Request) => handleMcpRequest(request);
export const DELETE = (request: Request) => handleMcpRequest(request);
