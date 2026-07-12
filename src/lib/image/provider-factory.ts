import type { ImageProvider } from "./types";
import { BflImageProvider } from "./bfl-provider";
import { FluxLocalImageProvider } from "./flux-local-provider";
import { MockImageProvider } from "./mock-provider";
import { RealImageProvider } from "./real-provider";

export function getImageProvider(): ImageProvider {
  if (process.env.IMAGE_PROVIDER === "bfl") return new BflImageProvider();
  if (process.env.IMAGE_PROVIDER === "flux-local") return new FluxLocalImageProvider();
  return process.env.IMAGE_PROVIDER === "real" ? new RealImageProvider() : new MockImageProvider();
}
