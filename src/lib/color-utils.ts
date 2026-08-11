// Utilitários de cor pra white-label: extrair a cor dominante de uma logo
// e gerar o conjunto completo de tokens de marca (fundo suave, borda,
// texto, etc.) a partir de uma única cor base, usando HSL.

function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace("#", "").match(/.{1,2}/g);
  if (!m || m.length < 3) return [103, 48, 142];
  return [parseInt(m[0], 16), parseInt(m[1], 16), parseInt(m[2], 16)];
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r: h = ((g - b) / d) % 6; break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, s * 100, l * 100];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100; l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let [r, g, b] = [0, 0, 0];
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

/**
 * Amostra os pixels de uma imagem já carregada e retorna a cor dominante
 * "útil" (ignora branco/preto/cinza quase puro, que são muito comuns em
 * fundos de logo e não servem como cor de marca). Roda 100% no navegador.
 */
export function extractDominantColor(img: HTMLImageElement): string | null {
  try {
    const size = 48;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);

    // Agrupa por matiz (bucket de 15°), acumulando RGB médio e peso por
    // saturação (matiz mais saturado = mais "cor de marca").
    const buckets = new Map<number, { r: number; g: number; b: number; weight: number }>();

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
      if (a < 200) continue; // pixel transparente
      const [h, s, l] = rgbToHsl(r, g, b);
      if (s < 20 || l < 12 || l > 90) continue; // ignora cinza/preto/branco quase puro
      const bucket = Math.round(h / 15) * 15;
      const entry = buckets.get(bucket) ?? { r: 0, g: 0, b: 0, weight: 0 };
      const w = s / 100;
      entry.r += r * w;
      entry.g += g * w;
      entry.b += b * w;
      entry.weight += w;
      buckets.set(bucket, entry);
    }

    let best: { r: number; g: number; b: number; weight: number } | null = null;
    for (const entry of buckets.values()) {
      if (!best || entry.weight > best.weight) best = entry;
    }
    if (!best || best.weight < 4) return null; // logo é só P&B / muito clara pra ter uma cor confiável

    return rgbToHex(best.r / best.weight, best.g / best.weight, best.b / best.weight);
  } catch {
    return null;
  }
}

/** Carrega uma URL de imagem (com CORS anônimo) e retorna a cor dominante. */
export function extractDominantColorFromUrl(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(extractDominantColor(img));
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export type BrandTokens = {
  brand: string;
  brandStrong: string;
  brandSoft: string;
  brandSoftStrong: string;
  brandText: string;
  primaryForeground: string;
};

/**
 * Gera o conjunto completo de tokens de marca (mesma "saturação"/tratamento
 * usado no roxo/laranja do M8HUB) a partir de UMA cor base, via HSL.
 */
export function deriveBrandTokens(hex: string): BrandTokens {
  const [r, g, b] = hexToRgb(hex);
  const [h, s, l] = rgbToHsl(r, g, b);

  // Garante saturação/luminosidade dentro de uma faixa que continua legível
  // como cor de marca (evita cores lavadas ou escuras demais vindas da logo).
  const safeS = Math.min(85, Math.max(40, s));
  const safeL = Math.min(55, Math.max(30, l));

  const [br, bg, bb] = hslToRgb(h, safeS, safeL);
  const brand = rgbToHex(br, bg, bb);

  const [sr, sg, sb] = hslToRgb(h, safeS, Math.max(18, safeL - 15));
  const brandStrong = rgbToHex(sr, sg, sb);

  const primaryForeground = safeL > 65 ? "#1F1F23" : "#FFFFFF";

  return {
    brand,
    brandStrong,
    brandSoft: `rgba(${br},${bg},${bb},.16)`,
    brandSoftStrong: `rgba(${br},${bg},${bb},.34)`,
    brandText: brand,
    primaryForeground,
  };
}
