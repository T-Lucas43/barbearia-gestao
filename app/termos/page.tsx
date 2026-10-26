import Brand from "@/components/Brand";
import { ThemeControl } from "@/components/ThemeProvider";
export const dynamic = "force-dynamic";
export const metadata = { title: "Termos de uso — Elares Barber" };
export default function Page() {
  const operator = process.env.OPERATOR_LEGAL_NAME;
  const contact = process.env.SUPPORT_EMAIL;
  return (
    <main className="access-page">
      <header className="booking-header">
        <a href="/">
          <Brand />
        </a>
        <ThemeControl />
      </header>
      <article className="panel legal-card">
        <span className="eyebrow">USO DA PLATAFORMA</span>
        <h1>Termos de uso</h1>
        <p>Versão 2026-10-26.1</p>
        {(!operator || !contact) && (
          <p className="demo-banner">
            Rascunho para demonstração. Identificação, suporte e condições
            comerciais precisam ser definidos antes da contratação real.
          </p>
        )}
        <h2>Serviço e contas</h2>
        <p>
          O Elares Barber organiza agenda, profissionais e financeiro de
          barbearias. Cada estabelecimento é responsável pelos dados
          cadastrados, pelas contas da equipe e pela conferência dos
          lançamentos. O profissional tem acesso limitado aos próprios
          registros.
        </p>
        <h2>Planos e cobrança manual</h2>
        <p>
          O preço e o limite de profissionais são apresentados no plano
          escolhido. A solicitação não debita valores nem ativa uma assinatura
          automaticamente. A administração confere o recebimento e informa a
          validade contratada. O histórico de valores e limites registrados é
          preservado.
        </p>
        <h2>Vencimento e acesso</h2>
        <p>
          Sem ativação, após o vencimento ou em caso de suspensão, novas
          operações podem ser bloqueadas. Consulta e exportação dos registros
          permanecem disponíveis à conta autorizada. Regras comerciais de
          cancelamento, reembolso e suporte devem constar da proposta ou
          contrato aprovado.
        </p>
        <h2>Responsabilidades de uso</h2>
        <p>
          Os relatórios dependem da correção dos lançamentos da equipe. Abrir o
          WhatsApp não comprova envio, entrega ou leitura. Os avisos na tela
          dependem do sistema aberto e não substituem o acompanhamento da
          agenda.
        </p>
        <h2>Operador e suporte</h2>
        <p>
          {operator || "Identificação do operador pendente."}{" "}
          {contact ? (
            <a href={"mailto:" + contact}>{contact}</a>
          ) : (
            "Contato comercial pendente."
          )}
        </p>
        <p className="muted">
          Este rascunho não substitui a revisão e aprovação das condições pelo
          responsável pela oferta comercial.
        </p>
        <a className="inline-link" href="/privacidade">
          Consultar privacidade
        </a>
      </article>
    </main>
  );
}
