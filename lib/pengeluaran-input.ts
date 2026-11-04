import { z } from "zod";

export const NOTA_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp", "pdf", "doc", "docx"];

const text = (message: string) => z.string({ required_error: message, invalid_type_error: message });
const optionalText = text("Isian tambahan harus berupa teks").nullable();
const dateFormat = z.union([z.string().date(), z.string().datetime({ offset: true })]);
const fields = z.object({
  judul: text("Judul wajib diisi").refine(value => Boolean(value.trim()), "Judul wajib diisi"),
  nominal: text("Nominal tidak valid").refine(value =>
    /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value.trim()) &&
    Number.isFinite(Number(value)) && Number(value) > 0, "Nominal harus berupa angka lebih dari 0")
    .transform(Number),
  tanggal: text("Tanggal wajib diisi").refine(value =>
    !value.startsWith("0000-") && dateFormat.safeParse(value).success &&
    Number.isFinite(new Date(value).getTime()), "Tanggal harus valid (YYYY-MM-DD atau ISO 8601 dengan zona waktu)"),
  jenis: z.enum(["PEMBELIAN_ASET", "MAINTENANCE", "LAINNYA"], {
    errorMap: () => ({ message: "Jenis pengeluaran tidak valid" }),
  }),
  pembelianKe: text("Pembelian ke harus berupa bilangan bulat positif").nullable()
    .refine(value => value === null || value === "" ||
      (/^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 2147483647),
    "Pembelian ke harus berupa bilangan bulat antara 1 dan 2147483647")
    .transform(value => value ? Number(value) : null),
  namaBarang: optionalText,
  progdi: optionalText,
  deskripsi: optionalText,
  keterangan: optionalText,
  jenisBukti: optionalText,
  nomorBukti: optionalText,
});
const assetIds = z.array(z.string().refine(value => Boolean(value.trim())));

export async function readPengeluaranInput(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return { error: "Body permintaan harus berupa form data yang valid" } as const;
  }
  const input = fields.safeParse(Object.fromEntries(
    Object.keys(fields.shape).map(key => [key, form.get(key)])
  ));
  if (!input.success) return { error: input.error.issues[0].message } as const;

  let rawIds: unknown = [];
  const value = form.get("barangIds");
  if (value !== null && value !== "") {
    if (typeof value !== "string") return { error: "Daftar barang harus berupa array JSON berisi ID barang" } as const;
    try {
      rawIds = JSON.parse(value);
    } catch {
      return { error: "Daftar barang harus berupa array JSON berisi ID barang" } as const;
    }
  }
  const ids = assetIds.safeParse(rawIds);
  if (!ids.success) return { error: "Daftar barang harus berupa array JSON berisi ID barang" } as const;

  const notas: File[] = [];
  for (const nota of form.getAll("nota")) {
    if (typeof nota === "string") return { error: "Nota harus berupa file" } as const;
    if (nota.size === 0) continue;
    const ext = (nota.name.split(".").pop() ?? "").toLowerCase();
    if (!NOTA_EXTENSIONS.includes(ext)) {
      return { error: `Format file .${ext} tidak didukung. Gunakan: ${NOTA_EXTENSIONS.join(", ")}` } as const;
    }
    notas.push(nota);
  }
  return { data: { ...input.data, barangIds: ids.data, hasBarangIds: form.has("barangIds"), notas } } as const;
}

export const pengeluaranQuery = z.object({
  limit: z.string().refine(value => /^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 500,
    "Limit harus berupa bilangan bulat antara 1 dan 500").transform(Number),
  jenis: z.enum(["", "PEMBELIAN_ASET", "MAINTENANCE", "LAINNYA"], {
    errorMap: () => ({ message: "Jenis pengeluaran tidak valid" }),
  }),
});
