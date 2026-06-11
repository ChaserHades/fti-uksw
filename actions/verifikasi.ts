// actions/verifikasi.ts
"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

export async function verifikasiUserAction(
  userId: string,
  action: "APPROVE" | "REJECT"
): Promise<{ success: boolean; message: string }> {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return { success: false, message: "Akses ditolak" };
    }

    const status = action === "APPROVE" ? "APPROVED" : "REJECTED";

    await prisma.user.update({
      where: { id: userId },
      data: { statusVerifikasi: status },
    });

    revalidatePath("/admin/verifikasi");
    return {
      success: true,
      message: action === "APPROVE" ? "User berhasil disetujui" : "User berhasil ditolak",
    };
  } catch (err) {
    console.error("verifikasiUserAction error:", err);
    return { success: false, message: "Gagal memproses, coba lagi" };
  }
}