import "dotenv/config";
import cors from "cors";
import express from "express";
import multer from "multer";
import { initDb, insertReceipt, listReceipts, getReceipt } from "./db.js";
import { parseReceiptFromImage } from "./llm.js";
import { receiptSchema } from "./validators.js";

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

app.use(cors());
app.use(express.json({ limit: "2mb" }));

const port = Number(process.env.PORT ?? 3001);
const db = await initDb();

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/parse", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "image file is required" });
  }

  const allowed = ["image/jpeg", "image/png", "image/jpg"];
  if (!allowed.includes(req.file.mimetype)) {
    return res.status(400).json({ error: "unsupported image type" });
  }

  try {
    const base64 = req.file.buffer.toString("base64");
    const data = await parseReceiptFromImage(base64, req.file.mimetype);
    return res.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(502).json({ error: "Failed to parse receipt", message });
  }
});

app.post("/api/receipts", async (req, res) => {
  const parsed = receiptSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid receipt data" });
  }

  const id = await insertReceipt(db, parsed.data);
  return res.status(201).json({ id, data: parsed.data });
});

app.get("/api/receipts", async (_req, res) => {
  const receipts = await listReceipts(db);
  return res.json({ receipts });
});

app.get("/api/receipts/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: "Invalid id" });
  }

  const receipt = await getReceipt(db, id);
  if (!receipt) {
    return res.status(404).json({ error: "Not found" });
  }

  return res.json(receipt);
});

app.listen(port, () => {
  console.log(`Receipt API running on http://localhost:${port}`);
});
