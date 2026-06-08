import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('123456', 10);

  let superAdminRole = await prisma.role.findFirst({ where: { name: 'SUPERADMIN', tenantId: null } });
  if (!superAdminRole) {
    superAdminRole = await prisma.role.create({ data: { name: 'SUPERADMIN', description: 'Global Super Administrator' } });
  }

  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@ccexpense.com' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'superadmin@ccexpense.com',
      passwordHash,
    }
  });

  const demoTenant = await prisma.tenant.upsert({
    where: { slug: 'empresa-demo' },
    update: {},
    create: {
      name: 'Empresa Demo',
      slug: 'empresa-demo',
    }
  });

  let adminRole = await prisma.role.findFirst({ where: { name: 'ADMIN', tenantId: demoTenant.id } });
  if (!adminRole) {
    adminRole = await prisma.role.create({ data: { name: 'ADMIN', tenantId: demoTenant.id, description: 'Tenant Administrator' } });
  }

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@corp.com' },
    update: {},
    create: {
      name: 'Admin Demo',
      email: 'admin@corp.com',
      passwordHash,
    }
  });

  await prisma.membership.upsert({
    where: { userId_tenantId: { userId: superAdmin.id, tenantId: demoTenant.id } as any },
    update: {},
    create: {
      userId: superAdmin.id,
      tenantId: demoTenant.id,
      roleId: superAdminRole.id
    }
  });

  await prisma.membership.upsert({
    where: { userId_tenantId: { userId: adminUser.id, tenantId: demoTenant.id } as any },
    update: {},
    create: {
      userId: adminUser.id,
      tenantId: demoTenant.id,
      roleId: adminRole.id
    }
  });

  // Seeds for some default cards for this tenant
  const cardCount = await prisma.creditCard.count({ where: { tenantId: demoTenant.id } });
  if (cardCount === 0) {
    await prisma.creditCard.createMany({
      data: [
        { tenantId: demoTenant.id, name: 'Nubank Ultravioleta', bankName: 'Nubank', brand: 'MASTERCARD', level: 'BLACK', lastFourDigits: '4567', limit: 15000, closingDay: 5, dueDay: 12, color: 'bg-purple-600' },
        { tenantId: demoTenant.id, name: 'Itaú Personnalité', bankName: 'Itaú', brand: 'MASTERCARD', level: 'BLACK', lastFourDigits: '8901', limit: 35000, closingDay: 10, dueDay: 20, color: 'bg-orange-500' },
        { tenantId: demoTenant.id, name: 'XP Visa Infinite', bankName: 'XP', brand: 'VISA', level: 'INFINITE', lastFourDigits: '2345', limit: 20000, closingDay: 25, dueDay: 5, color: 'bg-slate-800' }
      ]
    });
  }

  console.log('Seeding completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
