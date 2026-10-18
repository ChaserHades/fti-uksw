// app/api/me/route.ts
import { NextResponse } from "next/server";
import { checkApiAuth } from "@/lib/auth";

export async function GET() {
  const { session, error: authError } = await checkApiAuth();
  if (authError) return authError;

  return NextResponse.json({
    id: session.id,
    email: session.email,
    name: session.name,
    role: session.role,
    statusVerifikasi: session.statusVerifikasi,
  });
}
