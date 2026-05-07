import { GoogleGenAI } from "@google/genai";
import { receiptSchema, type ReceiptData } from "./validators.js";

const prompt = `Extract receipt data as JSON with keys: merchant, date, items, total.
Items is an array of { name, amount }.
Use empty string or 0 when unknown.
Exclude taxes, tips, discounts, and subtotals from items.
Return JSON only.`;

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (client) return client;
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GOOGLE_API_KEY in environment variables.");
  }
  client = new GoogleGenAI({ apiKey });
  return client;
}

function extractJson(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found in LLM response.");
  }
  return text.slice(start, end + 1);
}

export async function parseReceiptFromImage(
  base64: string,
  mimeType: string
): Promise<ReceiptData> {
  const model = process.env.GEMINI_MODEL ?? "gemini-3-flash-preview";
  const contents = [
    {
      role: "user",
      parts: [
        { inlineData: { mimeType, data: base64 } },
        { text: prompt },
      ],
    },
  ];

  const response = await getClient().models.generateContent({
    model,
    contents,
  });

  const text = response.text ?? "";
  const jsonText = extractJson(text);
  const parsed = receiptSchema.safeParse(JSON.parse(jsonText));
  if (!parsed.success) {
    throw new Error("LLM response did not match expected schema.");
  }
  return parsed.data;
}
