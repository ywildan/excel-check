export const authConfigured = Boolean(
  process.env.AUTH_SECRET &&
    process.env.AUTH_GOOGLE_ID &&
    process.env.AUTH_GOOGLE_SECRET &&
    process.env.DATABASE_URL
);

export async function getSession() {
  if (!authConfigured) return null;
  const { auth } = await import("@/auth");
  return auth();
}
