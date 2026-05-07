import { z } from "zod";

const money = z.preprocess((value) => {
  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.-]/g, "");
    if (cleaned === "") return undefined;
    return Number(cleaned);
  }
  return value;
}, z.number().finite());

const itemSchema = z.object({
  name: z.string().catch(""),
  amount: money.catch(0),
});

export const receiptSchema = z.object({
  merchant: z.string().catch(""),
  date: z.string().catch(""),
  items: z.array(itemSchema).catch([]),
  total: money.catch(0),
});

export type ReceiptData = z.infer<typeof receiptSchema>;
