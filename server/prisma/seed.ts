const { PrismaClient, TransactionType, Currency, RecurrenceFrequency, TransactionStatus } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

const MOCK_CARDS_DATA = [
  { id: 'c1', name: 'Nubank Platinum', last4Digits: '4242', limit: 15000, closingDay: 5, dueDay: 12, color: 'bg-purple-600' },
  { id: 'c2', name: 'XP Visa Infinite', last4Digits: '8811', limit: 50000, closingDay: 20, dueDay: 27, color: 'bg-slate-800' },
];

const DEFAULT_TRANSACTIONS_DATA = [
  {
    id: 't1',
    description: 'AWS Infrastructure',
    amount: 120.50,
    currency: Currency.USD,
    date: new Date().toISOString(),
    type: TransactionType.EXPENSE,
    status: TransactionStatus.PAID,
    cardId: 'c2',
    category: 'Infrastructure',
    tags: ['Cloud', 'DevOps'],
    isInstallment: false,
    isRecurring: true,
    recurrenceFrequency: RecurrenceFrequency.MONTHLY,
  },
  {
    id: 't2',
    description: 'MacBook Pro M3',
    amount: 12000,
    currency: Currency.BRL,
    date: new Date().toISOString(),
    type: TransactionType.EXPENSE,
    status: TransactionStatus.PENDING,
    cardId: 'c1',
    category: 'Equipment',
    tags: ['Office'],
    isInstallment: true,
    installmentId: 'inst_1',
    installmentNumber: 1,
    totalInstallments: 10,
    isRecurring: false,
  },
  {
    id: 't3',
    description: 'Freelance Project X',
    amount: 3500.00,
    currency: Currency.BRL,
    date: new Date().toISOString(),
    type: TransactionType.INCOME,
    status: TransactionStatus.PAID,
    category: 'Services',
    tags: ['Consulting'],
    isInstallment: false,
    isRecurring: false,
  }
];


async function main() {
  console.log('Start seeding...');

  // 1. Create a default user
  const hashedPassword = await bcrypt.hash('123456', 10);
  const user = await prisma.user.upsert({
    where: { email: 'admin@corp.com' },
    update: {},
    create: {
      email: 'admin@corp.com',
      name: 'Admin User',
      password: hashedPassword,
    },
  });
  console.log(`Created user: ${user.name}`);

  // 2. Create credit cards and associate them with the user
  for (const cardData of MOCK_CARDS_DATA) {
    await prisma.creditCard.upsert({
        where: { id: cardData.id },
        update: {},
        create: {
            ...cardData,
            userId: user.id
        }
    });
  }
  console.log(`Seeded ${MOCK_CARDS_DATA.length} credit cards.`);

  // 3. Create transactions and associate them with the user and cards
  for (const transData of DEFAULT_TRANSACTIONS_DATA) {
      await prisma.transaction.upsert({
          where: { id: transData.id },
          update: {},
          create: {
            ...transData,
            tags: transData.tags || [],
            date: new Date(transData.date),
            userId: user.id
          }
      })
  }
  console.log(`Seeded ${DEFAULT_TRANSACTIONS_DATA.length} transactions.`);

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
