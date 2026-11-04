// Deadline formulir disimpan sebagai tanggal UTC; batas pengembalian adalah 18.00 WIB.
function deadlineTime(deadline: string | Date): Date {
  const date = new Date(deadline);
  date.setUTCHours(11, 0, 0, 0);
  return date;
}

export function isOverdue(deadline: string | Date, now = new Date()): boolean {
  return now > deadlineTime(deadline);
}

export function isDueSoon(deadline: string | Date, now = new Date()): boolean {
  const diff = deadlineTime(deadline).getTime() - now.getTime();
  return diff > 0 && diff <= 86_400_000;
}

type LoanTiming = {
  status: string;
  deadlineKembali: string | Date;
  terlambat?: boolean;
};

export function isLoanLate(loan: LoanTiming, now = new Date()): boolean {
  return Boolean(loan.terlambat) ||
    (loan.status === "AKTIF" && isOverdue(loan.deadlineKembali, now));
}

export function lateLoanFilter(now = new Date()) {
  const boundary = new Date(now);
  boundary.setUTCHours(0, 0, 0, 0);
  // Tepat 18.00 WIB belum terlambat; sesudahnya tanggal hari ini ikut terpilih.
  if (now > deadlineTime(now)) boundary.setUTCDate(boundary.getUTCDate() + 1);
  return {
    OR: [
      { terlambat: true },
      { status: "AKTIF" as const, deadlineKembali: { lt: boundary } },
    ],
  };
}
