import { ApiFailure } from "@/lib/api";
import { plainText, unicodeLength } from "@/lib/security/text";

export const PROPOSAL_TITLE_MAX_LENGTH = 30;
export const PROPOSAL_CONTENT_MAX_LENGTH = 2_000;
export const PROPOSAL_REPLY_MAX_LENGTH = 1_000;

export function validateProposalTitle(value: string): string {
  const title = plainText(value);
  const length = unicodeLength(title);
  if (length < 1 || length > PROPOSAL_TITLE_MAX_LENGTH)
    throw new ApiFailure("INVALID_PROPOSAL_TITLE", `建言标题必须包含 1–${PROPOSAL_TITLE_MAX_LENGTH} 个字符。`);
  return title;
}

export function validateProposalContent(value: string): string {
  const content = plainText(value);
  if (unicodeLength(content) > PROPOSAL_CONTENT_MAX_LENGTH)
    throw new ApiFailure("INVALID_PROPOSAL_CONTENT", `建言内容不能超过 ${PROPOSAL_CONTENT_MAX_LENGTH} 个字符。`);
  return content;
}

export function validateProposalReply(value: string): string {
  const body = plainText(value);
  const length = unicodeLength(body);
  if (length < 1 || length > PROPOSAL_REPLY_MAX_LENGTH)
    throw new ApiFailure("INVALID_PROPOSAL_REPLY", `回复必须包含 1–${PROPOSAL_REPLY_MAX_LENGTH} 个字符。`);
  return body;
}

export function validateProposalId(value: string): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value))
    throw new ApiFailure("PROPOSAL_NOT_FOUND", "没有找到这条建言。", 404);
  return value;
}
