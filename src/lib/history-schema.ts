import { z } from "zod";

const flagSchema = z.object({
  level: z.string().max(20),
  text: z.string().max(600),
});

export const historyFileSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileSize: z.number().int().nonnegative().max(100_000_000),
  fileSha256: z.string().max(64),
  nama: z.string().max(120),
  nim: z.string().max(40),
  kelas: z.string().max(80),
  mataKuliah: z.string().max(120),
  tugas: z.string().max(160),
  activeSeconds: z.number().int().nonnegative().max(100_000_000),
  idleSeconds: z.number().int().nonnegative().max(100_000_000),
  editCount: z.number().int().nonnegative().max(10_000_000),
  pasteCount: z.number().int().nonnegative().max(10_000_000),
  saveCount: z.number().int().nonnegative().max(10_000_000),
  sheetCount: z.number().int().nonnegative().max(10_000),
  tableCount: z.number().int().nonnegative().max(10_000),
  cellCount: z.number().int().nonnegative().max(10_000_000),
  logStatus: z.string().max(30),
  verdict: z.string().max(30),
  flags: z.array(flagSchema).max(50),
});

export const historyPayloadSchema = z.object({
  batchId: z.string().min(8).max(64),
  files: z.array(historyFileSchema).min(1).max(200),
});

export type HistoryPayload = z.infer<typeof historyPayloadSchema>;
