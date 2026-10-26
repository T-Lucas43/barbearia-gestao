import { readJson } from "@/lib/http";
import { requireOrigin } from "@/lib/auth";
import { auth } from "@/lib/auth-engine";
import { appOrigin, mailReady } from "@/lib/mail";
import { errorResponse, HttpError, rateLimit } from "@/lib/http";
import { z } from "zod";
export async function POST(request: Request) {
  try {
    requireOrigin(request);
    const d = z
      .discriminatedUnion("action", [
        z
          .object({
            action: z.literal("request"),
            email: z.email().trim().toLowerCase(),
          })
          .strict(),
        z
          .object({
            action: z.literal("verify_email"),
            token: z.string().min(10).max(2048),
          })
          .strict(),
        z
          .object({
            action: z.literal("resend_verification"),
            email: z.email().trim().toLowerCase(),
          })
          .strict(),
        z
          .object({
            action: z.literal("reset"),
            token: z.string().min(10).max(500),
            password: z.string().min(10).max(128),
          })
          .strict(),
      ])
      .parse(await readJson(request));
    if (d.action === "verify_email") {
      await rateLimit("verification-submit", 100, 60);
      try {
        await auth.api.verifyEmail({
          query: { token: d.token },
          headers: request.headers,
        });
        return Response.json(
          { ok: true },
          { headers: { "Cache-Control": "no-store" } },
        );
      } catch {
        throw new HttpError(
          "Link de confirmação inválido ou expirado. Solicite uma nova confirmação.",
          400,
        );
      }
    }
    if (d.action === "reset") {
      await rateLimit("reset-submit", 100, 60);
      return await auth.api.resetPassword({
        body: { newPassword: d.password, token: d.token },
        headers: request.headers,
        asResponse: true,
      });
    }
    await rateLimit("recovery-global", 300, 3600);
    await rateLimit("recovery:" + d.email, 4, 900);
    if (!mailReady())
      throw new HttpError(
        "A recuperação por e-mail ainda não foi configurada. Procure a administração da plataforma.",
        503,
      );
    try {
      if (d.action === "resend_verification")
        await auth.api.sendVerificationEmail({
          body: { email: d.email, callbackURL: appOrigin() },
          headers: request.headers,
        });
      else
        await auth.api.requestPasswordReset({
          body: {
            email: d.email,
            redirectTo: appOrigin() + "/recuperar-senha",
          },
          headers: request.headers,
        });
    } catch {
      console.error(JSON.stringify({ event: "recovery_delivery_unavailable" }));
    }
    return Response.json(
      {
        ok: true,
        message:
          "Se houver uma conta ativa com esse e-mail, você receberá as instruções. Verifique também a pasta de spam.",
      },
      { status: 202, headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
