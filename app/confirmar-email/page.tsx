import VerifyEmailForm from "@/components/VerifyEmailForm";
export const metadata = {
  title: "Confirmar e-mail — Elares Barber",
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
};
export default function Page() {
  return <VerifyEmailForm />;
}
