import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middlewares/requireAuth';
import { requirePermission } from '../middlewares/permissions';
import { prisma } from '../services/prisma';

const router = Router();

router.use(requireAuth);

function parseCSV(content: string) {
  const lines = content.split('\n').map(l => l.trim()).filter(l => l);
  const result = [];
  let read = 0;
  
  for (const line of lines) {
    read++;
    // basic splitting
    let parts = line.split(',');
    if (parts.length >= 3) {
      let dateRaw = parts[0].trim();
      let desc = parts[1].trim();
      let amountRaw = parts[2].trim();
      let cat = parts[3] ? parts[3].trim() : 'General';
      
      const date = new Date(dateRaw);
      const amount = parseFloat(amountRaw);
      
      if (!isNaN(date.getTime()) && !isNaN(amount)) {
        result.push({
           date: date.toISOString(),
           description: desc,
           amount: amount,
           category: cat,
           type: amount >= 0 ? 'INCOME' : 'EXPENSE'
        });
      }
    }
  }
  return { read, data: result };
}

function parseOFX(content: string) {
  const lines = content.split('\n');
  const result = [];
  let read = 0;
  let inTx = false;
  let tempTx: any = {};
  
  for (const line of lines) {
    if (line.includes('<STMTTRN>')) {
      inTx = true;
      tempTx = {};
      read++;
    } else if (line.includes('</STMTTRN>')) {
      inTx = false;
      if (tempTx.date && tempTx.amount) {
         result.push({
           date: tempTx.date.toISOString(),
           description: tempTx.desc || 'OFX Transaction',
           amount: tempTx.amount,
           category: 'General',
           type: tempTx.amount >= 0 ? 'INCOME' : 'EXPENSE'
         });
      }
    } else if (inTx) {
      const matchTrnAmt = line.match(/<TRNAMT>([^<]+)/);
      if (matchTrnAmt) tempTx.amount = parseFloat(matchTrnAmt[1]);
      
      const matchDtPosted = line.match(/<DTPOSTED>([^<]+)/);
      if (matchDtPosted) {
         const ds = matchDtPosted[1];
         if (ds.length >= 8) {
           tempTx.date = new Date(`${ds.substring(0,4)}-${ds.substring(4,6)}-${ds.substring(6,8)}T12:00:00Z`);
         }
      }
      
      const matchName = line.match(/<NAME>([^<]+)/);
      if (matchName) tempTx.desc = matchName[1];
      const matchMemo = line.match(/<MEMO>([^<]+)/);
      if (matchMemo) tempTx.desc = matchMemo[1];
    }
  }
  
  return { read, data: result };
}

router.post('/preview', requirePermission('imports.create'), async (req: AuthRequest, res: Response) => {
   try {
     const { format, content } = req.body;
     let parsed: any;
     
     if (format === 'CSV') {
       parsed = parseCSV(content);
     } else if (format === 'OFX') {
       parsed = parseOFX(content);
     } else {
       return res.status(400).json({ error: 'Unsupported format' });
     }
     
     const summary = {
        read: parsed.read,
        normalized: parsed.data.length,
        errors: parsed.read - parsed.data.length,
        potentialDuplicates: 0,
        data: parsed.data
     };
     
     res.json(summary);
   } catch(e: any) {
     res.status(500).json({ error: e.message });
   }
});

router.post('/commit', requirePermission('imports.create'), async (req: AuthRequest, res: Response) => {
   try {
     const { transactions } = req.body;
     
     let imported = 0;
     let ignored = 0;
     
     for (const t of transactions) {
         // simple duplicate check
         const existing = await prisma.transaction.findFirst({
            where: {
               tenantId: req.user!.tenantId,
               amount: t.amount,
               date: new Date(t.date),
               description: t.description
            }
         });
         
         if (existing) {
            ignored++;
         } else {
            await prisma.transaction.create({
               data: {
                  tenantId: req.user!.tenantId,
                  date: new Date(t.date),
                  description: t.description,
                  amount: Math.abs(t.amount),
                  type: t.type,
                  category: t.category || 'General',
                  status: 'PAID'
               }
            });
            imported++;
         }
     }
     
     await prisma.auditLog.create({
        data: { tenantId: req.user!.tenantId, userId: req.user!.id, action: 'CREATE_BULK', entity: 'Import', entityId: 'bulk', metadata: JSON.stringify({ imported, ignored }) }
     });

     res.json({ success: true, imported, ignored, total: transactions.length });
   } catch(e: any) {
     res.status(500).json({ error: e.message });
   }
});

export default router;
