import "dotenv/config";
import { createServer } from "node:http";
import { networkInterfaces } from "node:os";
const candidates = Object.entries(networkInterfaces())
  .filter(([name]) => !/docker|wsl|vethernet|loopback|virtualbox/i.test(name))
  .flatMap(([, rows]) => rows || [])
  .filter(
    (a) =>
      a.family === "IPv4" &&
      !a.internal &&
      /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(a.address),
  );
const ip = process.env.LAN_HOST || candidates[0]?.address;
if (!ip || !/^\d+\.\d+\.\d+\.\d+$/.test(ip))
  throw Error(
    "Nenhum IPv4 privado encontrado. Configure LAN_HOST com o IP da rede local.",
  );
const port = 3001;
const origin = `http://${ip}:${port}`;
const upstream = "http://127.0.0.1:3000";
const server = createServer(async (req, res) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "no-store");
  if (req.headers.host !== `${ip}:${port}`) {
    res.writeHead(421);
    res.end("Host inválido.");
    return;
  }
  const url = new URL(req.url || "/", origin);
  const path = url.pathname;
  const method = req.method || "GET";
  if (method === "GET" && path === "/") {
    res.writeHead(302, { Location: "/tv" });
    res.end();
    return;
  }
  const asset =
    path.startsWith("/_next/static/") &&
    !path.includes("%") &&
    /\.(js|css|woff2?|ttf|png|svg)$/.test(path);
  const allowed =
    (method === "GET" &&
      (path === "/tv" ||
        path === "/api/tv" ||
        path === "/icon.svg" ||
        asset)) ||
    (method === "POST" && path === "/api/tv/pair");
  if (!allowed) {
    res.writeHead(403, { "Content-Type": "text/plain;charset=utf-8" });
    res.end(
      "Este endereço permite somente a tela de TV. A administração permanece no computador local.",
    );
    return;
  }
  if (method === "POST" && req.headers.origin !== origin) {
    res.writeHead(403);
    res.end("Origem inválida.");
    return;
  }
  try {
    const headers: Record<string, string> = {};
    let body: Buffer | undefined;
    if (path.startsWith("/api/tv")) {
      const cookie = (req.headers.cookie || "")
        .split(";")
        .map((c) => c.trim())
        .find((c) => c.startsWith("navalha_tv="));
      if (cookie) headers.Cookie = cookie;
    }
    if (method === "POST") {
      const parts: Buffer[] = [];
      let size = 0;
      for await (const chunk of req) {
        const bytes = Buffer.from(chunk);
        size += bytes.length;
        if (size > 4096) {
          res.writeHead(413);
          res.end("Payload muito grande.");
          return;
        }
        parts.push(bytes);
      }
      body = Buffer.concat(parts);
      headers["Content-Type"] = "application/json";
      headers.Origin = upstream;
    }
    const response = await fetch(upstream + path + url.search, {
      method,
      headers,
      body: body ? new Uint8Array(body) : undefined,
      redirect: "manual",
      signal: AbortSignal.timeout(15000),
    });
    const type = response.headers.get("content-type");
    if (type) res.setHeader("Content-Type", type);
    for (const cookie of response.headers.getSetCookie())
      res.appendHeader("Set-Cookie", cookie);
    res.writeHead(response.status);
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch {
    res.writeHead(502, { "Content-Type": "text/plain;charset=utf-8" });
    res.end(
      "Não foi possível conectar ao servidor local. Confira se a aplicação está executando na porta 3000.",
    );
  }
});
server.requestTimeout = 15000;
server.headersTimeout = 10000;
server.listen(port, ip, () =>
  console.log(
    `TV na rede privada: ${origin}/tv\nSomente /tv, leitura de /api/tv, pareamento e recursos estáticos. Agenda, login, contas e financeiro NÃO são publicados. Nenhuma regra de firewall foi alterada.`,
  ),
);
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () => server.close(() => process.exit(0)));
