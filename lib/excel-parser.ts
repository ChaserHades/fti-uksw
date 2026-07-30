import ExcelJS from "exceljs";

export type ParsedBarang = {
  namaBarang: string | null;
  label: string | null;
  labelAset: string | null;
  sn: string | null;
  merek: string | null;
  model: string | null;
  tipe: string | null;
  vendor: string | null;
  keterangan: string | null;
  kondisi: string;
  status: string;
  kategori: string | null;
  ruangan: string | null;
  tanggalDatang: Date | null;
  tanggalPindah: Date | null;
  harga: number | null;
  jumlah: number;
};

export async function parseBarangExcel(buffer: Buffer | ArrayBuffer): Promise<ParsedBarang[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as ExcelJS.Buffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error("Worksheet tidak ditemukan di file Excel");
  }

  // Semantic Column Mapping
  const colMap = {
    namaBarang: -1,
    kategori: -1,
    label: -1,
    labelAset: -1,
    sn: -1,
    merek: -1,
    model: -1,
    tipe: -1,
    ruangan: -1,
    keterangan: -1,
    vendor: -1,
    harga: -1,
    tanggalDatang: -1,
    tanggalPindah: -1,
  };

  // Find headers in the first 3 rows
  for (let r = 1; r <= 3; r++) {
    const row = worksheet.getRow(r);
    row.eachCell((cell, colNumber) => {
      const val = String(cell.value || "").toLowerCase().trim();
      if (!val) return;

      if (val === "nama barang" || val === "nama" || val === "nama aset") {
        colMap.namaBarang = colNumber;
      } else if (val === "kategori" || val === "jenis barang") {
        colMap.kategori = colNumber;
      } else if (val === "label" || val === "kode aset" || val === "kode label") {
        colMap.label = colNumber;
      } else if (val === "label aset" || val === "kode inventaris") {
        colMap.labelAset = colNumber;
      } else if (val === "sn" || val === "serial number") {
        colMap.sn = colNumber;
      } else if (val === "merk" || val === "merek") {
        colMap.merek = colNumber;
      } else if (val === "model") {
        colMap.model = colNumber;
      } else if (val === "type" || val === "tipe") {
        colMap.tipe = colNumber;
      } else if (val === "ruangan" || val === "lokasi") {
        colMap.ruangan = colNumber;
      } else if (val === "keterangan" || val === "deskripsi") {
        colMap.keterangan = colNumber;
      } else if (val === "vendor" || val === "supplier") {
        colMap.vendor = colNumber;
      } else if (val === "harga" || val === "nilai") {
        colMap.harga = colNumber;
      } else if (val === "tgl datang" || val === "tanggal datang" || val === "tahun" || val.includes("datang")) {
        colMap.tanggalDatang = colNumber;
      } else if (val === "tgl pindah" || val === "tanggal pindah" || val.includes("pindah")) {
        colMap.tanggalPindah = colNumber;
      }
    });
    // If we found at least some key columns, stop searching for headers
    if (colMap.kategori !== -1 || colMap.namaBarang !== -1 || colMap.label !== -1) {
      break;
    }
  }

  // Fallback to hardcoded format if totally failed to find headers (legacy support)
  if (colMap.kategori === -1 && colMap.namaBarang === -1) {
    colMap.kategori = 2;
    colMap.label = 3;
    colMap.sn = 4;
    colMap.labelAset = 5;
    colMap.merek = 6;
    colMap.model = 7;
    colMap.tipe = 8;
    colMap.ruangan = 9;
    colMap.keterangan = 10;
    colMap.vendor = 11;
    colMap.harga = 12;
    colMap.tanggalDatang = 13;
    colMap.tanggalPindah = 14;
  }

  const results: ParsedBarang[] = [];

  const isSubstantive = (v: string | null): boolean => {
    if (!v) return false;
    return (v.replace(/[^a-zA-Z0-9\u00C0-\u024F]/g, "").length >= 2);
  };

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber < 3) return; // Skip potential header rows

    const namaValue = colMap.namaBarang !== -1 ? getCellValue(worksheet, rowNumber, colMap.namaBarang) : null;
    const kategoriValue = colMap.kategori !== -1 ? getCellValue(worksheet, rowNumber, colMap.kategori) : null;
    const labelValue = colMap.label !== -1 ? getCellValue(worksheet, rowNumber, colMap.label) : null;
    const labelAsetValue = colMap.labelAset !== -1 ? getCellValue(worksheet, rowNumber, colMap.labelAset) : null;
    const snValue = colMap.sn !== -1 ? getCellValue(worksheet, rowNumber, colMap.sn) : null;

    if (!namaValue && !kategoriValue && !labelValue && !labelAsetValue && !snValue) {
      return;
    }

    if (!isSubstantive(namaValue) && !isSubstantive(kategoriValue) && !isSubstantive(labelValue) && !isSubstantive(labelAsetValue) && !isSubstantive(snValue)) {
      return;
    }

    results.push({
      namaBarang: namaValue,
      label: labelValue,
      labelAset: labelAsetValue,
      sn: snValue,
      merek: colMap.merek !== -1 ? getCellValue(worksheet, rowNumber, colMap.merek) : null,
      model: colMap.model !== -1 ? getCellValue(worksheet, rowNumber, colMap.model) : null,
      tipe: colMap.tipe !== -1 ? getCellValue(worksheet, rowNumber, colMap.tipe) : null,
      vendor: colMap.vendor !== -1 ? getCellValue(worksheet, rowNumber, colMap.vendor) : null,
      keterangan: colMap.keterangan !== -1 ? getCellValue(worksheet, rowNumber, colMap.keterangan) : null,
      kondisi: "BAIK",
      status: "TERSEDIA",
      kategori: kategoriValue,
      ruangan: colMap.ruangan !== -1 ? getCellValue(worksheet, rowNumber, colMap.ruangan) : null,
      tanggalDatang: colMap.tanggalDatang !== -1 ? parseDateValue(worksheet.getCell(rowNumber, colMap.tanggalDatang).value) : null,
      tanggalPindah: colMap.tanggalPindah !== -1 ? parseDateValue(worksheet.getCell(rowNumber, colMap.tanggalPindah).value) : null,
      harga: colMap.harga !== -1 ? parseNumberValue(worksheet.getCell(rowNumber, colMap.harga).value) : null,
      jumlah: 1,
    });
  });

  return results;
}

function getCellValue(worksheet: ExcelJS.Worksheet, row: number, col: number): string | null {
  const cell = worksheet.getCell(row, col);
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
