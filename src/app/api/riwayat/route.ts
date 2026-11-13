import { NextResponse } from "next/server";
import { authConfigured, getSession } from "@/lib/auth-mode";
import { historyPayloadSchema } from "@/lib/history-schema";

async function sessionUserId() {
  if (!authConfigured) return { error: "not-configured" as const };
  const session = await getSession();
  if (!session?.user?.id) return { error: "unauthorized" as const };
  return { userId: session.user.id };
}

export async function POST(request: Request) {
  const auth = await sessionUserId();
  if ("error" in auth) {
    if (auth.error === "not-configured") {
      return NextResponse.json(
        { error: "Riwayat belum dikonfigurasi." },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = historyPayloadSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Payload tidak valid", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { prisma } = await import("@/lib/prisma");
  const { batchId, files } = parsed.data;

  await prisma.$transaction([
    prisma.checkRun.deleteMany({ where: { userId: auth.userId, batchId } }),
    prisma.checkRun.createMany({
      data: files.map((file) => ({
        ...file,
        userId: auth.userId,
        batchId,
      })),
    }),
  ]);

  return NextResponse.json({ ok: true, count: files.length });
}

export async function GET() {
  const auth = await sessionUserId();
  if ("error" in auth) {
    if (auth.error === "not-configured") {
      return NextResponse.json({ error: "Riwayat belum dikonfigurasi." }, { status: 503 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { prisma } = await import("@/lib/prisma");
  const runs = await prisma.checkRun.findMany({
    where: { userId: auth.userId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ runs });
}

export async function DELETE(request: Request) {
  const auth = await sessionUserId();
  if ("error" in auth) {
    if (auth.error === "not-configured") {
      return NextResponse.json({ error: "Riwayat belum dikonfigurasi." }, { status: 503 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const batchId = new URL(request.url).searchParams.get("batchId");
  const { prisma } = await import("@/lib/prisma");
  const result = await prisma.checkRun.deleteMany({
    where: { userId: auth.userId, ...(batchId ? { batchId } : {}) },
  });

  return NextResponse.json({ ok: true, deleted: result.count });
}
