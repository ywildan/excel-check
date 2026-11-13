"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { authConfigured, getSession } from "@/lib/auth-mode";
import { prisma } from "@/lib/prisma";

async function requireUserId() {
  if (!authConfigured) redirect("/masuk?error=config");
  const session = await getSession();
  if (!session?.user?.id) redirect("/masuk");
  return session.user.id;
}

export async function deleteBatch(formData: FormData) {
  const userId = await requireUserId();
  const batchId = String(formData.get("batchId") || "");
  if (!batchId) return;
  await prisma.checkRun.deleteMany({ where: { userId, batchId } });
  revalidatePath("/riwayat");
}

export async function deleteAll() {
  const userId = await requireUserId();
  await prisma.checkRun.deleteMany({ where: { userId } });
  revalidatePath("/riwayat");
}

export async function logout() {
  if (!authConfigured) redirect("/");
  const { signOut } = await import("@/auth");
  await signOut({ redirectTo: "/" });
}
