import { auth } from "@/lib/auth-engine";
import { requireOrigin, session } from "@/lib/auth";
import { errorResponse } from "@/lib/http";
const allowed = new Set([
  "get-session",
  "sign-in/email",
  "sign-out",
  "change-password",
]);
async function handler(request: Request) {
  try {
    const path = new URL(request.url).pathname.replace(/^\/api\/auth\//, "");
    if (!allowed.has(path))
      return Response.json(
        {
          error: "Endpoint indisponível. Contas são criadas pelo proprietário.",
        },
        { status: 404 },
      );
    if (request.method !== "GET") requireOrigin(request);
    const signed = path === "change-password" ? await session() : null;
    if (path === "change-password" && !signed)
      return Response.json({ error: "Entre para continuar." }, { status: 401 });
    if (path === "change-password" && (signed?.read_only || signed?.is_demo))
      return Response.json(
        { error: "A conta de demonstração não pode ter a senha alterada." },
        { status: 403 },
      );
    return await auth.handler(request);
  } catch (e) {
    return errorResponse(e);
  }
}
export { handler as GET, handler as POST };
