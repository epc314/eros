export interface GeneratedImage {
  provider: string;
  providerModel?: string;
  providerRequestId?: string;
  imageUrl?: string;
  imageDataUrl?: string;
  width?: number;
  height?: number;
}

export interface ImageGenerationInput {
  prompt: string;
  width?: number;
  height?: number;
  providerSeed?: string;
  variationId?: string;
  nodeId?: string;
  nodeName?: string;
  genomeHex?: string;
  tokenIds?: number[];
}

export interface ImageProvider {
  readonly name: string;
  generate(input: ImageGenerationInput): Promise<GeneratedImage>;
}
