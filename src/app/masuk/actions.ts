"use server";

import { redirect } from "next/navigation";
import { authConfigured } from "@/lib/auth-mode";

export async function loginWithGoogle() {
  if (!authConfigured) {
    redirect("/masuk?error=config");
  }
  const { signIn } = await import("@/auth");
  await signIn("google", { redirectTo: "/riwayat" });
}
