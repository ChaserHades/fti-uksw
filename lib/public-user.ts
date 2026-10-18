import type { Prisma } from "@/generated/prisma/client";

export const publicUserSelect = {
    id: true,
    name: true,
    email: true,
    role: true,
    statusVerifikasi: true,
    mustChangePassword: true,
    createdAt: true,
} as const satisfies Prisma.UserSelect;