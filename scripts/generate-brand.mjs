import sharp from "sharp";
import { readFile } from "node:fs/promises";
const icon = await readFile("public/icon.svg");
for (const size of [192, 512, 180])
  await sharp(icon)
    .resize(size, size)
    .png()
    .toFile(`public/icons/elares-${size}.png`);
await sharp(await readFile("public/brand/elares-barber-dark.svg"))
  .resize({ width: 620 })
  .png()
  .toFile("public/brand/elares-barber-dark.png");
console.log("Ícones e logotipo Elares Barber gerados a partir dos vetores.");
await sharp(Buffer.from(icon.toString().replace('rx="108"', 'rx="0"')))
  .resize(512, 512)
  .png()
  .toFile("public/icons/elares-maskable-512.png");
