import { prisma } from "@/lib/admin/db";

const commentInclude = {
  author: {
    select: { id: true, name: true, email: true },
  },
  interaction: {
    select: { id: true, type: true, occurredAt: true },
  },
} as const;

export async function listCompanyComments(companyId: string) {
  return prisma.comment.findMany({
    where: { companyId },
    include: commentInclude,
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function listInteractionComments(interactionId: string) {
  return prisma.comment.findMany({
    where: { interactionId },
    include: commentInclude,
    orderBy: { createdAt: "asc" },
  });
}
