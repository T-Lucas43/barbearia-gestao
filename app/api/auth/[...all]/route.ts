import { requireAccount } from "@/lib/account";
import { auth } from "@/lib/auth-engine";
import { requireOrigin } from "@/lib/auth";
import { errorResponse, readJson } from "@/lib/http";
const allowed = new Set([
  "get-session",
  "sign-in/email",
  "sign-out",
  "change-password",
  "verify-email",
  "revoke-other-sessions",
  "two-factor/enable",
  "two-factor/disable",
  "two-factor/verify-totp",
  "two-factor/verify-backup-code",
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
    const protectedChange = [
      "change-password",
      "two-factor/enable",
      "two-factor/disable",
      "revoke-other-sessions",
    ].includes(path);
    const signed = protectedChange ? await requireAccount() : null;
    if (protectedChange && !signed)
      return Response.json({ error: "Entre para continuar." }, { status: 401 });
    if (protectedChange && (signed?.read_only || signed?.is_demo))
      return Response.json(
        { error: "A conta de demonstração não pode ter a senha alterada." },
        { status: 403 },
      );
    if (request.method === "POST") {
      const body = await readJson(request);
      const headers = new Headers(request.headers);
      headers.delete("content-length");
      return await auth.handler(
        new Request(request.url, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        }),
      );
    }
    return await auth.handler(request);
  } catch (e) {
    return errorResponse(e);
  }
}
export { handler as GET, handler as POST };
