import { shake256 } from "@noble/hashes/sha3.js";
import type { GeneratedImage, ImageGenerationInput, ImageProvider } from "./types";

const escapeXml = (value: string) => value.replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&apos;",
}[character] ?? character));

export class MockImageProvider implements ImageProvider {
  readonly name = "mock";

  async generate(input: ImageGenerationInput): Promise<GeneratedImage> {
    const width = input.width ?? 720;
    const height = input.height ?? 480;
    const identity = `${input.genomeHex ?? input.nodeId ?? input.prompt}\u0000${input.variationId ?? "primary"}`;
    const bytes = shake256(new TextEncoder().encode(identity), { dkLen: 32 });
    const hueA = bytes[0] / 255 * 360;
    const hueB = (hueA + 70 + bytes[1]) % 360;
    const shapes = Array.from({ length: 9 }, (_, index) => {
      const x = 80 + ((bytes[index + 2] * 47 + index * 83) % Math.max(100, width - 160));
      const y = 70 + ((bytes[index + 11] * 31 + index * 59) % Math.max(100, height - 160));
      const radius = 18 + bytes[index + 20] % 68;
      const opacity = (0.18 + (bytes[index + 5] % 55) / 100).toFixed(2);
      return `<circle cx="${x}" cy="${y}" r="${radius}" fill="hsl(${(hueA + index * 23) % 360} 70% 60%)" opacity="${opacity}"/>`;
    }).join("");
    const name = escapeXml(input.nodeName ?? "Eros entity");
    const shortHash = escapeXml((input.genomeHex ?? input.nodeId ?? "").slice(0, 12));
    const tokenLine = escapeXml((input.tokenIds ?? []).slice(0, 6).join(" · "));
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="hsl(${hueA} 45% 12%)"/><stop offset="1" stop-color="hsl(${hueB} 55% 18%)"/></linearGradient><filter id="b"><feGaussianBlur stdDeviation="8"/></filter></defs>
      <rect width="100%" height="100%" rx="28" fill="url(#g)"/> <g filter="url(#b)">${shapes}</g>
      <path d="M${width * .18} ${height * .58} Q${width * .36} ${height * .18} ${width * .52} ${height * .52} T${width * .82} ${height * .42} Q${width * .68} ${height * .84} ${width * .42} ${height * .7} T${width * .18} ${height * .58}Z" fill="none" stroke="hsla(${hueB} 90% 78% / .8)" stroke-width="4"/>
      <text x="36" y="${height - 72}" fill="white" font-family="ui-monospace,monospace" font-size="24">${name}</text>
      <text x="36" y="${height - 42}" fill="rgba(255,255,255,.65)" font-family="ui-monospace,monospace" font-size="14">${shortHash} · ${tokenLine}</text>
    </svg>`;
    return { provider: this.name, imageDataUrl: `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`, width, height };
  }
}
