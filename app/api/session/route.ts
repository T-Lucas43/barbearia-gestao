import { readJson } from "@/lib/http";
import { auth } from "@/lib/auth-engine";
import { requireOrigin } from "@/lib/auth";
import { errorResponse, rateLimit } from "@/lib/http";
import { z } from "zod";
export async function POST(request: Request) {
  try {
    requireOrigin(request);
    const body = z
      .object({
        email: z.email().transform((v) => v.toLowerCase().trim()),
        password: z.string().min(1).max(128),
      })
      .parse(await readJson(request));
    await rateLimit("login:" + body.email, 15, 900);
    return await auth.api.signInEmail({
      body,
      headers: request.headers,
      asResponse: true,
    });
  } catch (e) {
    return errorResponse(e);
  }
}
export async function DELETE(request: Request) {
  try {
    requireOrigin(request);
    return await auth.api.signOut({
      headers: request.headers,
      asResponse: true,
    });
  } catch (e) {
    return errorResponse(e);
  }
}
