import { createHmac, timingSafeEqual } from "node:crypto";
import { decryptToken } from "./secure-token";
export type NotificationData = {
  id: string;
  kind: string;
  phone: string;
  customer: string;
  service_name: string;
  professional_name: string;
  starts_at: string;
  manage_cipher: string | null;
  appointment_id: string;
  slug: string;
};
export class DeliveryError extends Error {
  constructor(
    message: string,
    public retryable = false,
    public uncertain = false,
  ) {
    super(message);
  }
}
export function verifyWebhook(
  raw: string,
  signature: string | null,
  secret: string,
) {
  if (!signature || !/^sha256=[a-f0-9]{64}$/.test(signature)) return false;
  const expected = createHmac("sha256", secret).update(raw).digest("hex");
  return timingSafeEqual(
    Buffer.from(signature.slice(7), "hex"),
    Buffer.from(expected, "hex"),
  );
}
export function buildWhatsAppPayload(
  task: NotificationData,
  template: string,
  baseURL: string,
  language = "pt_BR",
) {
  const url = new URL(baseURL);
  if (url.protocol !== "https:")
    throw new DeliveryError(
      "APP_URL precisa ser um endereço HTTPS acessível aos clientes.",
    );
  if (!/^[a-z0-9_]+$/.test(template))
    throw new DeliveryError("Configure um nome de modelo aprovado e válido.");
  const date = new Date(task.starts_at);
  const token = task.manage_cipher ? decryptToken(task.manage_cipher) : null;
  const manage = token
    ? `${url.origin}/meu-agendamento/${task.appointment_id}#${token}`
    : `${url.origin}/agendar/${task.slug}`;
  const values = [
    task.customer.split(" ")[0],
    task.service_name,
    date.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }),
    date.toLocaleTimeString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
    }),
    task.professional_name,
    manage,
  ];
  const to = task.phone.length <= 11 ? "55" + task.phone : task.phone;
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "template",
    biz_opaque_callback_data: task.id,
    template: {
      name: template,
      language: { code: language },
      components: [
        {
          type: "body",
          parameters: values.map((text) => ({ type: "text", text })),
        },
      ],
    },
  };
}
export async function sendWhatsApp(
  task: NotificationData,
  fetcher: typeof fetch = fetch,
) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const number = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const version = process.env.WHATSAPP_API_VERSION;
  const template = process.env["WHATSAPP_TEMPLATE_" + task.kind.toUpperCase()];
  if (
    !token ||
    !number ||
    !/^\d+$/.test(number) ||
    !version ||
    !/^v\d+\.\d+$/.test(version) ||
    !template
  )
    throw new DeliveryError(
      "Credenciais, versão ou modelo de WhatsApp ausentes.",
    );
  const body = buildWhatsAppPayload(
    task,
    template,
    process.env.APP_URL || "",
    process.env.WHATSAPP_TEMPLATE_LANGUAGE || "pt_BR",
  );
  let response: Response;
  try {
    response = await fetcher(
      `https://graph.facebook.com/${version}/${number}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000),
      },
    );
  } catch {
    throw new DeliveryError(
      "Conexão interrompida: confirmar o resultado no provedor antes de reenviar.",
      false,
      true,
    );
  }
  let result: { messages?: { id: string }[]; error?: { code?: number } };
  try {
    result = await response.json();
  } catch {
    throw new DeliveryError(
      "Resposta não reconhecida: conciliação necessária.",
      false,
      true,
    );
  }
  if (response.status === 429)
    throw new DeliveryError("Limite temporário do provedor.", true, false);
  if (response.status >= 500)
    throw new DeliveryError(
      "Falha do provedor com efeito incerto: conciliação necessária.",
      false,
      true,
    );
  if (!response.ok)
    throw new DeliveryError(
      `Provedor recusou a mensagem (código ${result.error?.code || response.status}).`,
    );
  const id = result.messages?.[0]?.id;
  if (!id)
    throw new DeliveryError(
      "Provedor não retornou o identificador: conciliação necessária.",
      false,
      true,
    );
  return id;
}
