import { PrismaClient } from '@prisma/client';
import { AsyncLocalStorage } from 'async_hooks';

export const tenantContext = new AsyncLocalStorage<{ tenantId: string }>();

const basePrisma = new PrismaClient();

export const prisma = basePrisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const context = tenantContext.getStore();
        if (context?.tenantId) {
          const tenantModels = ['CreditCard', 'Transaction', 'Budget', 'RecurringRule', 'AuditLog', 'Membership'];
          
          if (tenantModels.includes(model)) {
            if (['findMany', 'findFirst', 'findFirstOrThrow', 'count', 'updateMany', 'deleteMany', 'aggregate', 'groupBy'].includes(operation)) {
              (args as any).where = { ...((args as any).where || {}), tenantId: context.tenantId };
            } else if (['create', 'createMany'].includes(operation)) {
              if ((args as any).data) {
                 if (Array.isArray((args as any).data)) {
                    (args as any).data = (args as any).data.map((d: any) => ({ ...d, tenantId: context.tenantId }));
                 } else {
                    (args as any).data = { ...(args as any).data, tenantId: context.tenantId };
                 }
              }
            }
          }
        }
        return query(args);
      },
    },
  },
});
