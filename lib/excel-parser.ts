import ExcelJS from "exceljs";

export type ParsedBarang = {
  label: string;
  labelAset: string | null;
  sn: string | null;
  merek: string | null;
  model: string | null;
  tipe: string | null;
  vendor: string | null;
  keterangan: string | null;
  kondisi: string;
  status: string;
  kategori: string;
  ruangan: string | null;
  tanggalDatang: Date | null;
  tanggalPindah: Date | null;
  harga: number | null;
  jumlah: number;
};

// Map columns to standard index based on expected template
const COL = {
  NO: 1,
  JENIS_BARANG: 2,
  LABEL: 3,
  SN: 4,
  LABEL_ASET: 5,
  MERK: 6,
  MODEL: 7,
  TYPE: 8,
  RUANGAN: 9,
  KETERANGAN: 10,
  VENDOR: 11,
  HARGA: 12,
  TGL_DATANG: 13,
  TGL_PINDAH: 14,
};

export async function parseBarangExcel(buffer: Buffer | ArrayBuffer): Promise<ParsedBarang[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as ExcelJS.Buffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error("Worksheet tidak ditemukan di file Excel");
  }

  const results: ParsedBarang[] = [];


  // Let's start reading from row 3 or the first row with a number in NO column
  // Helper: check if a value has real substance (not just symbols/punctuation)
  const isSubstantive = (v: string | null): boolean => {
    if (!v) return false;
    // Must have at least 2 alphanumeric characters
    return (v.replace(/[^a-zA-Z0-9\u00C0-\u024F]/g, "").length >= 2);
  };

  worksheet.eachRow((row, rowNumber) => {
    // Skip header rows (we assume data starts when NO column has a value or row > 2)
    if (rowNumber < 3) return;

    // Check if the row has a "kategori" or "nama" (they might be merged but we get value)
    const jenisValue = getCellValue(worksheet, rowNumber, COL.JENIS_BARANG);
    const labelValue = getCellValue(worksheet, rowNumber, COL.LABEL);
    const labelAsetValue = getCellValue(worksheet, rowNumber, COL.LABEL_ASET);
    const snValue = getCellValue(worksheet, rowNumber, COL.SN);


    if (!jenisValue && !labelValue && !labelAsetValue && !snValue) {
      return;
    }

    // Skip rows where ALL columns are just anomalous symbols (no substantive data)
    if (!isSubstantive(jenisValue) && !isSubstantive(labelValue) && !isSubstantive(labelAsetValue) && !isSubstantive(snValue)) {
      return;
    }

    const kategori = jenisValue || "";

    results.push({
      label: labelValue || "",
      labelAset: labelAsetValue || null,
      sn: snValue || null,
      merek: getCellValue(worksheet, rowNumber, COL.MERK) || null,
      model: getCellValue(worksheet, rowNumber, COL.MODEL) || null,
      tipe: getCellValue(worksheet, rowNumber, COL.TYPE) || null,
      vendor: getCellValue(worksheet, rowNumber, COL.VENDOR) || null,
      keterangan: getCellValue(worksheet, rowNumber, COL.KETERANGAN) || null,
      kondisi: "BAIK",
      status: "TERSEDIA",
      kategori: kategori,
      ruangan: getCellValue(worksheet, rowNumber, COL.RUANGAN) || null,
      tanggalDatang: parseDateValue(worksheet.getCell(rowNumber, COL.TGL_DATANG).value),
      tanggalPindah: parseDateValue(worksheet.getCell(rowNumber, COL.TGL_PINDAH).value),
      harga: parseNumberValue(worksheet.getCell(rowNumber, COL.HARGA).value),
      jumlah: 1,
    });
  });

  return results;
}

function getCellValue(worksheet: ExcelJS.Worksheet, row: number, col: number): string | null {
  const cell = worksheet.getCell(row, col);
  // buat merged cell
  let val = cell.value;
  if (cell.isMerged && cell.master) {
    val = cell.master.value;
  }

  if (val === null || val === undefined) return null;
  if (typeof val === "object" && "richText" in val) {
    return val.richText.map(rt => rt.text).join("").trim() || null;
  }
  return String(val).trim() || null;
}

function parseDateValue(val: ExcelJS.CellValue): Date | null {
  if (val instanceof Date) return val;
  if (typeof val === "string") {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
  }
  if (typeof val === "number") {
    // Excel dates are number of days since Jan 1 1900
    // roughly...
    return new Date(Math.round((val - 25569) * 86400 * 1000));
  }
  return null;
}

function parseNumberValue(val: ExcelJS.CellValue): number | null {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const parsed = parseFloat(val.replace(/[^0-9.-]+/g, ""));
    if (!isNaN(parsed)) return parsed;
  }
  return null;
}
