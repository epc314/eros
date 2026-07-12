export type DescriptionKind = "BIRTH" | "STORY" | "DEATH" | "REVIVAL";

export const EROS_BIRTH_RECORD =
  "最初，长着黑色羽翼的黑夜，在无边无际的厄瑞玻斯深渊怀抱中产下了一枚未经受孕的神秘之卵。经过漫长岁月的轮回，这枚卵中诞生了优雅的厄洛斯（Eros）";

export const EROS_DEATH_RECORD = "祂终于逃离了生育繁衍的荣耀和诅咒，再次拥抱了虚无......";

export function genesisBirthRecord(name: string, supplied?: string): string {
  return supplied?.trim() || `${name}诞生于虚无中...`;
}

export function descendantBirthRecord(name: string, parentAName: string, parentBName: string, supplied?: string): string {
  return supplied?.trim() || `${name}诞生于${parentAName}与${parentBName}的结合...`;
}
