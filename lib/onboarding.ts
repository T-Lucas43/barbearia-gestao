import { mailReady } from "./mail";
export const legalVersion = "2026-10-26.1";
export function signupAvailable() {
  if (process.env.NODE_ENV === "production" && process.env.DEMO_MODE === "true")
    return false;
  return (
    process.env.PUBLIC_SIGNUP_ENABLED === "true" &&
    mailReady() &&
    (process.env.NODE_ENV !== "production" ||
      (!!process.env.OPERATOR_LEGAL_NAME &&
        !!process.env.SUPPORT_EMAIL &&
        process.env.REQUIRE_EMAIL_VERIFICATION === "true"))
  );
}
