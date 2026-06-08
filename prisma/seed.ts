import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await prisma.$transaction(async () => await bcrypt.hash('123456', 10)); // just to avoid issues

  // 1. Tenants
  const demoTenant = await prisma.tenant.upsert({
    where: { slug: 'empresa-demo' },
    update: {},
    create: {
      name: 'Empresa Demo',
      slug: 'empresa-demo',
    }
  });

  // 2. Roles
  let superAdminRole = await prisma.role.findFirst({ where: { name: 'SUPERADMIN', tenantId: null } });
  if (!superAdminRole) {
    superAdminRole = await prisma.role.create({ data: { name: 'SUPERADMIN', description: 'Global Super Administrator' } });
  }

  const baseRoles = ['ADMIN', 'MEMBER', 'VIEWER'];
  for (const roleName of baseRoles) {
    let r = await prisma.role.findFirst({ where: { name: roleName, tenantId: demoTenant.id } });
    if (!r) await prisma.role.create({ data: { name: roleName, tenantId: demoTenant.id, description: `${roleName} Role` } });
  }

  let adminRole = await prisma.role.findFirst({ where: { name: 'ADMIN', tenantId: demoTenant.id } });
  let memberRole = await prisma.role.findFirst({ where: { name: 'MEMBER', tenantId: demoTenant.id } });
  let viewerRole = await prisma.role.findFirst({ where: { name: 'VIEWER', tenantId: demoTenant.id } });

  // 3. Permissions
  const permissions = [
    'dashboard.view',
    'transactions.view', 'transactions.create', 'transactions.update', 'transactions.delete',
    'cards.view', 'cards.create', 'cards.update', 'cards.delete',
    'budgets.view', 'budgets.create', 'budgets.update', 'budgets.delete',
    'reports.view', 'imports.create', 'exports.create', 'settings.view', 'settings.update',
    'users.view', 'users.create', 'users.update', 'users.delete', 'audit.view', 'admin.view'
  ];

  for (const p of permissions) {
    await prisma.permission.upsert({
      where: { key: p },
      update: {},
      create: { key: p, description: p }
    });
  }

  // 4. Assign to roles
  const allPermissions = await prisma.permission.findMany();
  
  for (const p of allPermissions) {
    // SUPERADMIN
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: superAdminRole!.id, permissionId: p.id } },
      update: {}, create: { roleId: superAdminRole!.id, permissionId: p.id }
    });
    
    // ADMIN (no admin.view)
    if (!p.key.startsWith('admin.')) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: adminRole!.id, permissionId: p.id } },
        update: {}, create: { roleId: adminRole!.id, permissionId: p.id }
      });
    }

    // MEMBER
    if (['transactions.view', 'transactions.create', 'transactions.update', 'cards.view', 'budgets.view', 'dashboard.view'].includes(p.key)) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: memberRole!.id, permissionId: p.id } },
        update: {}, create: { roleId: memberRole!.id, permissionId: p.id }
      });
    }

    // VIEWER
    if (p.key.endsWith('.view') && p.key !== 'admin.view') {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: viewerRole!.id, permissionId: p.id } },
        update: {}, create: { roleId: viewerRole!.id, permissionId: p.id }
      });
    }
  }

  // 5. Users
  const pass = await bcrypt.hash('123456', 10);
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@ccexpense.com' },
    update: { passwordHash: pass },
    create: { name: 'Super Admin', email: 'superadmin@ccexpense.com', passwordHash: pass }
  });

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@corp.com' },
    update: { passwordHash: pass },
    create: { name: 'Admin Demo', email: 'admin@corp.com', passwordHash: pass }
  });

  await prisma.membership.upsert({
    where: { userId_tenantId: { userId: superAdmin.id, tenantId: demoTenant.id } as any },
    update: { roleId: superAdminRole!.id },
    create: { userId: superAdmin.id, tenantId: demoTenant.id, roleId: superAdminRole!.id }
  });

  await prisma.membership.upsert({
    where: { userId_tenantId: { userId: adminUser.id, tenantId: demoTenant.id } as any },
    update: { roleId: adminRole!.id },
    create: { userId: adminUser.id, tenantId: demoTenant.id, roleId: adminRole!.id }
  });

  // Seeds for some default cards for this tenant
  const cardCount = await prisma.creditCard.count({ where: { tenantId: demoTenant.id } });
  if (cardCount === 0) {
    await prisma.creditCard.createMany({
      data: [
        { tenantId: demoTenant.id, name: 'Nubank Ultravioleta', bankName: 'Nubank', brand: 'MASTERCARD', level: 'BLACK', lastFourDigits: '4567', limit: 15000, closingDay: 5, dueDay: 12, color: 'bg-purple-600', status: 'ACTIVE', isDefault: true, isActive: true },
        { tenantId: demoTenant.id, name: 'Itaú Personnalité', bankName: 'Itaú', brand: 'MASTERCARD', level: 'BLACK', lastFourDigits: '8901', limit: 35000, closingDay: 10, dueDay: 20, color: 'bg-orange-500', status: 'ACTIVE', isDefault: false, isActive: true },
        { tenantId: demoTenant.id, name: 'XP Visa Infinite', bankName: 'XP', brand: 'VISA', level: 'INFINITE', lastFourDigits: '2345', limit: 20000, closingDay: 25, dueDay: 5, color: 'bg-slate-800', status: 'ACTIVE', isDefault: false, isActive: true }
      ]
    });
  }

  // Transactions
  const txCount = await prisma.transaction.count({ where: { tenantId: demoTenant.id } });
  const card = await prisma.creditCard.findFirst({ where: { tenantId: demoTenant.id } });
  if (txCount === 0 && card) {
    await prisma.transaction.createMany({
      data: [
        { tenantId: demoTenant.id, cardId: card.id, description: 'Amazon', amount: 150, date: new Date(), type: 'EXPENSE', status: 'PAID', category: 'Shopping' },
        { tenantId: demoTenant.id, cardId: card.id, description: 'Netflix', amount: 45, date: new Date(), type: 'EXPENSE', status: 'PAID', category: 'Entertainment' },
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
