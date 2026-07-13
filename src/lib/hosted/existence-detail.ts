import { buildEntityImagePrompt } from "../protocol/prompt";
import { decodeGenome } from "../protocol/token-decoder";
import { getHostedNodeByReference } from "./repository";

export async function hostedExistenceDetail(reference: string) {
  const detail = await getHostedNodeByReference(reference);
  const { node, reproduction, parents, children, images, descriptions } = detail;
  const tokens = decodeGenome(node.genomeHex, reproduction?.mutationMaskHex, node.promptVersion);
  const records = descriptions.map(({ trueCount, falseCount, ...record }) => ({
    ...record,
    feedback: { trueVotes: trueCount, falseVotes: falseCount, disputed: falseCount > trueCount },
  }));
  return {
    schema: "eros-existence-detail-v1" as const,
    generatedAt: new Date().toISOString(),
    existence: node,
    relationships: {
      parents: parents.map(({ id, name, type, generation, isDead, createdAt }) => ({ id, name, type, generation, status: isDead ? "dead" as const : "alive" as const, createdAt })),
      children: children.map(({ id, name, type, generation, isDead, createdAt }) => ({ id, name, type, generation, status: isDead ? "dead" as const : "alive" as const, createdAt })),
    },
    reproduction,
    tokens,
    prompt: buildEntityImagePrompt(tokens),
    images,
    records,
  };
}
