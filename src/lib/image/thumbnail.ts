import { decode } from "fast-png";
import jpeg from "jpeg-js";

const BACKGROUND = [2, 6, 23] as const;

function channel(pixels: Uint8Array, offset: number, channels: number, index: 0 | 1 | 2): number {
  if (channels <= 2) return pixels[offset];
  return pixels[offset + index];
}

export function createJpegThumbnail(pngBytes: ArrayBuffer, width: number, height: number, quality: number): Uint8Array {
  const source = decode(new Uint8Array(pngBytes));
  if (source.depth !== 8 || !(source.data instanceof Uint8Array) || source.channels < 1 || source.channels > 4)
    throw new Error("Thumbnail source must be an 8-bit PNG");

  const output = new Uint8Array(width * height * 4);
  for (let index = 0; index < output.length; index += 4) {
    output[index] = BACKGROUND[0]; output[index + 1] = BACKGROUND[1];
    output[index + 2] = BACKGROUND[2]; output[index + 3] = 255;
  }
  const scale = Math.min(width / source.width, height / source.height);
  const drawnWidth = Math.max(1, Math.round(source.width * scale));
  const drawnHeight = Math.max(1, Math.round(source.height * scale));
  const offsetX = Math.floor((width - drawnWidth) / 2);
  const offsetY = Math.floor((height - drawnHeight) / 2);
  const pixels = source.data as Uint8Array;

  for (let y = 0; y < drawnHeight; y++) {
    const sourceY = Math.min(source.height - 1, Math.floor(y / scale));
    for (let x = 0; x < drawnWidth; x++) {
      const sourceX = Math.min(source.width - 1, Math.floor(x / scale));
      const sourceOffset = (sourceY * source.width + sourceX) * source.channels;
      const outputOffset = ((offsetY + y) * width + offsetX + x) * 4;
      const alpha = source.channels === 2 || source.channels === 4 ? pixels[sourceOffset + source.channels - 1] / 255 : 1;
      for (let color = 0 as 0 | 1 | 2; color < 3; color = (color + 1) as 0 | 1 | 2)
        output[outputOffset + color] = Math.round(channel(pixels, sourceOffset, source.channels, color) * alpha + BACKGROUND[color] * (1 - alpha));
      output[outputOffset + 3] = 255;
    }
  }

  return new Uint8Array(jpeg.encode({ data: output, width, height }, quality).data);
}
