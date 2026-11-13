import type { NextRequest } from "next/server";
import { authConfigured } from "@/lib/auth-mode";

export async function GET(request: NextRequest) {
  if (!authConfigured) {
    return Response.json({}, { status: 200 });
  }
  const { handlers } = await import("@/auth");
  return handlers.GET(request);
}

export async function POST(request: NextRequest) {
  if (!authConfigured) {
    return Response.json(
      { error: "Login Google belum dikonfigurasi." },
      { status: 503 }
    );
  }
  const { handlers } = await import("@/auth");
  return handlers.POST(request);
}
