import { createHash, randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import { NextResponse } from "next/server";

const TEMPLATE_PATH = path.join(
  process.cwd(),
  "public",
  "downloads",
  "Tracker_Audit_Tugas.xlsm",
);

const XLSM_MIME = "application/vnd.ms-excel.sheet.macroEnabled.12";

// Properti custom di template terakhir memakai pid 2..24.
const PID_ISSUED_ID = "25";
const PID_ISSUED_AT = "26";

const FMTID = "{D5CDD505-2E9C-101B-9397-08002B2CF9AE}";

function newIssuedId() {
  const stamp = new Date()
    .toISOString()
    .replace(/[-:T]/g, "")
    .slice(0, 14); // YYYYMMDDHHmmss (UTC)
  const suffix = randomBytes(3)
    .toString("hex")
    .toUpperCase();
  return `T${stamp}-${suffix}`;
}

function propertyXml(pid: string, name: string, value: string) {
  return (
    `<property fmtid="${FMTID}" pid="${pid}" name="${name}">` +
    `<vt:lpwstr>${value}</vt:lpwstr>` +
    `</property>`
  );
}

async function stampTemplate(): Promise<{
  buffer: Buffer;
  issuedId: string;
  issuedAt: string;
}> {
  const issuedId = newIssuedId();
  const issuedAt = new Date().toISOString();

  const raw = await readFile(TEMPLATE_PATH);
  const zip = await JSZip.loadAsync(raw);

  const customPath = "docProps/custom.xml";
  const customXml = await zip.file(customPath)!.async("string");

  if (customXml.includes("Audit_IssuedId")) {
    throw new Error("Template sudah memiliki Audit_IssuedId");
  }

  const injected =
    propertyXml(PID_ISSUED_ID, "Audit_IssuedId", issuedId) +
    propertyXml(PID_ISSUED_AT, "Audit_IssuedAt", issuedAt);
  const stampedXml = customXml.replace(
    "</Properties>",
    injected + "</Properties>",
  );
  zip.file(customPath, stampedXml, { createFolders: false });

  const buffer = (await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 9 },
  })) as Buffer;

  return { buffer, issuedId, issuedAt };
}

function clientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

export async function GET(request: Request) {
  let result;
  try {
    result = await stampTemplate();
  } catch (error) {
    console.error("Gagal men-stamp template:", error);
    return NextResponse.json(
      { error: "Template tidak tersedia" },
      { status: 503 },
    );
  }

  // Pencatatan bersifat best-effort: tanpa DB, unduhan tetap berjalan.
  // Import dilakukan di sini supaya route tetap hidup tanpa DATABASE_URL.
  try {
    const { prisma } = await import("@/lib/prisma");
    await prisma.templateDownload.create({
      data: {
        issuedId: result.issuedId,
        source: "generator",
        ipHash: createHash("sha256").update(clientIp(request)).digest("hex"),
        userAgent: request.headers.get("user-agent") ?? undefined,
      },
    });
  } catch (error) {
    console.warn("Pencatatan TemplateDownload dilewati:", error);
  }

  const filename = `Tracker_Audit_Tugas_${result.issuedId}.xlsm`;
  return new NextResponse(new Uint8Array(result.buffer), {
    status: 200,
    headers: {
      "Content-Type": XLSM_MIME,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
      "X-Issued-Id": result.issuedId,
    },
  });
}
