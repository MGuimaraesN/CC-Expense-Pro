import { PrismaClient, CreditCard } from '@prisma/client';

const prisma = new PrismaClient();

export const getCards = async (userId: string): Promise<CreditCard[]> => {
  return prisma.creditCard.findMany({
    where: { userId },
  });
};
