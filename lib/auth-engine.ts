import "dotenv/config";
import { betterAuth, type BetterAuthOptions } from "better-auth";
import { db } from "./db";
import { twoFactor } from "better-auth/plugins";
import { appOrigin, sendAccessMail } from "./mail";
export const authOptions = {
  database: db,
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL || "http://127.0.0.1:3000",
  trustedOrigins: (
    process.env.APP_ORIGINS || "http://127.0.0.1:3000,http://localhost:3000"
  )
    .split(",")
    .map((s) => s.trim()),
  appName: "Elares Barber",
  advanced: { cookiePrefix: "elares-barber" },
  logger: {
    level: "error",
    log: (level) => {
      console.error(JSON.stringify({ event: "authentication_library", level }));
    },
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    maxPasswordLength: 128,
    autoSignIn: false,
    requireEmailVerification: process.env.REQUIRE_EMAIL_VERIFICATION === "true",
    revokeSessionsOnPasswordReset: true,
    resetPasswordTokenExpiresIn: 1800,
    sendResetPassword: async ({ user, token }) => {
      const member = (
        await db.query(
          "SELECT active,is_demo FROM memberships WHERE user_id=$1",
          [user.id],
        )
      ).rows[0];
      const admin = (
        await db.query(
          "SELECT 1 FROM platform_admins WHERE user_id=$1 AND active",
          [user.id],
        )
      ).rowCount;
      if ((!member?.active && !admin) || member?.is_demo) return;
      await sendAccessMail(
        user.email,
        "reset",
        appOrigin() + "/recuperar-senha#token=" + encodeURIComponent(token),
      );
    },
  },
  emailVerification: {
    autoSignInAfterVerification: false,
    sendVerificationEmail: async ({ user, token }) => {
      await sendAccessMail(
        user.email,
        "verify",
        appOrigin() + "/confirmar-email#token=" + encodeURIComponent(token),
      );
    },
  },
  plugins: [twoFactor()],
  user: { modelName: "auth_user" },
  session: {
    modelName: "auth_session",
    expiresIn: 43200,
    updateAge: 3600,
    cookieCache: { enabled: false },
  },
  account: { modelName: "auth_account" },
  verification: { modelName: "auth_verification" },
  rateLimit: { enabled: true, storage: "database", window: 60, max: 30 },
} satisfies BetterAuthOptions;
export const auth = betterAuth(authOptions);
