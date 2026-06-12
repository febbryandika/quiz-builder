import { NextResponse } from "next/server";

// Standard error shape for all Route Handlers (SPEC §5.3):
// { error: { code: string, message: string } }
export function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}
