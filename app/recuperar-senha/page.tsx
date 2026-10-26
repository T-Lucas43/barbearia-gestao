import RecoveryForm from "@/components/RecoveryForm";
export const metadata = {
  title: "Recuperar acesso — Elares Barber",
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
};
export default function Page() {
  return <RecoveryForm />;
}
