import ExcelJS from "exceljs";

export type ParsedBarang = {
  label: string;
  labelAset: string | null;
  nama: string;
  sn: string | null;
  merek: string | null;
  model: string | null;
  tipe: string | null;
  vendor: string | null;
  keterangan: string | null;
  kondisi: string;
  status: string;
  jenisBarang: string;
  letak: string | null;
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
  LETAK: 9,
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
  
  // We assume the header is in row 2 (due to merged headers in row 1 possibly)
  // Let's start reading from row 3 or the first row with a number in NO column
  worksheet.eachRow((row, rowNumber) => {
    // Skip header rows (we assume data starts when NO column has a value or row > 2)
    if (rowNumber < 3) return;
    
    // Check if the row has a "jenis barang" or "nama" (they might be merged but we get value)
    const jenisValue = getCellValue(worksheet, rowNumber, COL.JENIS_BARANG);
    const labelValue = getCellValue(worksheet, rowNumber, COL.LABEL);
    const labelAsetValue = getCellValue(worksheet, rowNumber, COL.LABEL_ASET);
    const snValue = getCellValue(worksheet, rowNumber, COL.SN);
    
    // If no unique keys are present at all and no type, skip it
    if (!jenisValue && !labelValue && !labelAsetValue && !snValue) {
      return;
    }
    
    const nama = jenisValue || "Tanpa Nama";
    const jenisBarang = jenisValue || "Lainnya";

    results.push({
      label: labelValue || "",
      labelAset: labelAsetValue || null,
      nama: nama,
      sn: snValue || null,
      merek: getCellValue(worksheet, rowNumber, COL.MERK) || null,
      model: getCellValue(worksheet, rowNumber, COL.MODEL) || null,
      tipe: getCellValue(worksheet, rowNumber, COL.TYPE) || null,
      vendor: getCellValue(worksheet, rowNumber, COL.VENDOR) || null,
      keterangan: getCellValue(worksheet, rowNumber, COL.KETERANGAN) || null,
      kondisi: "BAIK",
      status: "TERSEDIA",
      jenisBarang: jenisBarang,
      letak: getCellValue(worksheet, rowNumber, COL.LETAK) || null,
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
  // If the cell is merged, its value comes from the master cell
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
    const parsed = parseFloat(val.replace(/[^0-9.-]+/g,""));
    if (!isNaN(parsed)) return parsed;
  }
  return null;
}
