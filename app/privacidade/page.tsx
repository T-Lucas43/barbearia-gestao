import Brand from "@/components/Brand";
import { ThemeControl } from "@/components/ThemeProvider";
export const dynamic = "force-dynamic";
export const metadata = { title: "Privacidade — Elares Barber" };
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
        <span className="eyebrow">TRANSPARÊNCIA</span>
        <h1>Aviso de privacidade</h1>
        <p>Versão 2026-10-26.1</p>
        {(!operator || !contact) && (
          <p className="demo-banner">
            Documento em preparação. Faltam a identificação e o contato do
            operador para a oferta comercial. Não use dados reais na
            demonstração.
          </p>
        )}
        <h2>Dados e finalidades</h2>
        <p>
          O sistema utiliza nome, telefone, agendamento e registros de pagamento
          para organizar os atendimentos. Contas da equipe usam nome, e-mail e
          credenciais protegidas pela biblioteca de autenticação. A preferência
          de aparência é guardada no seu dispositivo.
        </p>
        <h2>Responsabilidades</h2>
        <p>
          Cada barbearia administra os dados dos seus clientes e as permissões
          da equipe. O fornecedor da plataforma opera a infraestrutura conforme
          o contrato aplicável.{" "}
          {operator ? "Operador da plataforma: " + operator + "." : ""}
        </p>
        <h2>WhatsApp e dispositivos</h2>
        <p>
          O envio manual abre o WhatsApp com o número do cliente e uma mensagem
          editável, somente quando há autorização de contato. A equipe deve
          revisar a mensagem. O WhatsApp tem suas próprias condições de uso. A
          tela de TV apresenta nomes abreviados e não mostra telefones ou
          financeiro.
        </p>
        <h2>Acesso e conservação</h2>
        <p>
          Profissionais acessam seus próprios atendimentos e valores. A equipe
          deve atender pedidos de acesso, correção e anonimização conforme a
          finalidade e as obrigações aplicáveis. Registros financeiros podem
          precisar ser preservados; anonimizar um cliente não apaga o histórico
          de valores.
        </p>
        <h2>Solicitações e contato</h2>
        <p>
          Clientes devem procurar a barbearia em que agendaram. Para questões da
          plataforma,{" "}
          {contact ? (
            <a href={"mailto:" + contact}>{contact}</a>
          ) : (
            "o contato de suporte ainda será definido"
          )}
          .
        </p>
        <p className="muted">
          Este texto precisa ser revisado e aprovado pelo responsável antes da
          operação comercial.
        </p>
        <a className="inline-link" href="/">
          Voltar ao sistema
        </a>
      </article>
    </main>
  );
}
