import { z } from "zod";

const requiredText = (message: string) => z.string({
  required_error: message,
  invalid_type_error: message,
}).refine(value => value.trim().length > 0, message);

const deadlineFormat = z.union([
  z.string().date(),
  z.string().datetime({ offset: true }),
]);

export const peminjamanInput = z.object({
  barangId: requiredText("Barang wajib dipilih"),
  namaPeminjam: requiredText("Nama peminjam wajib diisi").transform(value => value.trim()),
  ruanganTujuan: requiredText("Ruangan wajib diisi").transform(value => value.trim()),
  deadlineKembali: requiredText("Deadline kembali wajib diisi").refine(value =>
    !value.startsWith("0000-") && deadlineFormat.safeParse(value).success &&
    Number.isFinite(new Date(value).getTime()),
  "Deadline kembali harus berupa tanggal yang valid (YYYY-MM-DD atau ISO 8601 dengan zona waktu)"),
  catatan: z.string({ invalid_type_error: "Catatan harus berupa teks" }).nullish(),
}, { invalid_type_error: "Data peminjaman harus berupa objek JSON" });

// Pemindai dan dashboard saat ini mengambil hingga 500 pinjaman aktif.
export const peminjamanQuery = z.object({
  limit: z.string().refine(value => /^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 500,
    "Limit harus berupa bilangan bulat antara 1 dan 500").transform(Number),
  status: z.enum(["", "AKTIF", "SELESAI", "TERLAMBAT"], {
    errorMap: () => ({ message: "Status harus AKTIF, SELESAI, atau TERLAMBAT" }),
  }),
});
