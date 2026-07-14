import { prisma } from "./prisma";

export async function resolveKategori(input?: string | null): Promise<string | null> {
  if (!input || !input.trim()) return null;
  const val = input.trim();

  // Try exactly matching ID
  let k = await prisma.kategori.findUnique({ where: { id: val } });
  if (k) return k.id;

  // Try matching by name
  k = await prisma.kategori.findFirst({
    where: { nama: { equals: val, mode: "insensitive" } }
  });
  if (k) return k.id;

  // Create new
  k = await prisma.kategori.create({ data: { nama: val } });
  return k.id;
}

export async function resolveRuangan(input?: string | null): Promise<string | null> {
  if (!input || !input.trim()) return null;
  const val = input.trim();

  // Try exactly matching ID
  let r = await prisma.ruangan.findUnique({ where: { id: val } });
  if (r) return r.id;

  // Try matching by code
  r = await prisma.ruangan.findFirst({
    where: { kode: { equals: val, mode: "insensitive" } }
  });
  if (r) return r.id;

  // Try matching by name
  r = await prisma.ruangan.findFirst({
    where: { nama: { equals: val, mode: "insensitive" } }
  });
  if (r) return r.id;

  // Create new
  const match = val.match(/^(\d)/);
  const lantaiStr = match ? `Lantai ${match[1]}` : null;
  r = await prisma.ruangan.create({
    data: { kode: val, nama: val, lantai: lantaiStr }
  });
  return r.id;
}
