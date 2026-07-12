import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class ApiFailure extends Error {
  constructor(public code: string, message: string, public status = 400, public details?: unknown) {
    super(message);
  }
}

export function apiError(error: unknown): NextResponse {
  if (error instanceof ZodError) return NextResponse.json({ error: {
    code: "INVALID_REQUEST", message: "The request body is invalid.", details: error.flatten(),
  } }, { status: 400 });
  if (error instanceof ApiFailure) return NextResponse.json({ error: {
    code: error.code, message: error.message, ...(error.details === undefined ? {} : { details: error.details }),
  } }, { status: error.status });
  console.error("Eros API failure", error);
  return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "The request could not be completed." } }, { status: 500 });
}
