import { requireAccount } from "@/lib/account";
import AccountPanel from "@/components/AccountPanel";
import Brand from "@/components/Brand";
import { ThemeControl } from "@/components/ThemeProvider";
import Link from "next/link";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Minha conta — Elares Barber",
  robots: { index: false, follow: false },
};
export default async function Page() {
  let account;
  try {
    account = await requireAccount();
  } catch {
    return (
      <main className="access-page">
        <section className="panel access-card">
          <h1>Minha conta</h1>
          <Link className="primary" href="/?next=administracao">
            Entre para continuar
          </Link>
        </section>
      </main>
    );
  }
  return (
    <main className="access-page">
      <header className="booking-header">
        <a href="/">
          <Brand />
        </a>
        <ThemeControl />
      </header>
      <div className="account-page-content">
        <AccountPanel
          name={account.name}
          readOnly={account.is_demo || account.read_only}
        />
        <a
          className="inline-link"
          href={account.platform ? "/administracao" : "/"}
        >
          Voltar ao painel
        </a>
      </div>
    </main>
  );
}
