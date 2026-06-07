import express from 'express';
import path from 'path';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { createServer as createViteServer } from 'vite';

const prisma = new PrismaClient();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Wait for DB to be ready, run simple migration by pushing schema 
  // (In dev, doing Prisma db push is easiest to keep schema updated without manual migrations)

  // Seed default cards if empty
  const ensureDefaultCards = async () => {
    const cardCount = await prisma.creditCard.count();
    if (cardCount === 0) {
      await prisma.creditCard.createMany({
        data: [
          { name: 'Nubank Ultravioleta', last4Digits: '4567', limit: 15000, closingDay: 5, dueDay: 12, color: 'bg-purple-600' },
          { name: 'Itaú Personnalité', last4Digits: '8901', limit: 35000, closingDay: 10, dueDay: 20, color: 'bg-orange-500' },
          { name: 'XP Visa Infinite', last4Digits: '2345', limit: 20000, closingDay: 25, dueDay: 5, color: 'bg-slate-800' }
        ]
      });
    }
  };
  await ensureDefaultCards();

  const ensureProfile = async () => {
    let profile = await prisma.userProfile.findFirst();
    if (!profile) {
      await prisma.userProfile.create({
        data: {
          name: 'Admin User',
          email: 'admin@corp.com',
          avatarUrl: 'https://i.pravatar.cc/150?u=admin'
        }
      });
    } else if (profile.email !== 'admin@corp.com') {
      await prisma.userProfile.update({
        where: { id: profile.id },
        data: {
          email: 'admin@corp.com'
        }
      });
    }
  };
  await ensureProfile();

  // API Routes
  
  // Cards
  app.get('/api/cards', async (req, res) => {
    const cards = await prisma.creditCard.findMany();
    res.json(cards);
  });

  app.post('/api/cards', async (req, res) => {
    const card = await prisma.creditCard.create({ data: req.body });
    res.json(card);
  });

  app.put('/api/cards/:id', async (req, res) => {
    const card = await prisma.creditCard.update({ where: { id: req.params.id }, data: req.body });
    res.json(card);
  });

  app.delete('/api/cards/:id', async (req, res) => {
    await prisma.creditCard.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  });

  // Transactions
  app.get('/api/transactions', async (req, res) => {
    const txs = await prisma.transaction.findMany({ include: { comments: true }, orderBy: { date: 'desc' } });
    // Transform JSON strings to arrays
    const formatted = txs.map(t => ({
      ...t,
      date: t.date.toISOString(),
      recurrenceEndDate: t.recurrenceEndDate ? t.recurrenceEndDate.toISOString() : undefined,
      tags: t.tags ? JSON.parse(t.tags) : [],
      comments: t.comments.map(c => ({
        ...c,
        timestamp: c.timestamp.toISOString()
      }))
    }));
    res.json(formatted);
  });

  app.post('/api/transactions', async (req, res) => {
    const data = req.body;
    const tx = await prisma.transaction.create({
      data: {
        description: data.description,
        amount: data.amount,
        currency: data.currency,
        originalAmount: data.originalAmount,
        originalCurrency: data.originalCurrency,
        exchangeRate: data.exchangeRate,
        date: new Date(data.date),
        type: data.type,
        status: data.status,
        cardId: data.cardId,
        category: data.category,
        tags: JSON.stringify(data.tags || []),
        isInstallment: data.isInstallment ?? false,
        installmentId: data.installmentId,
        installmentNumber: data.installmentNumber,
        totalInstallments: data.totalInstallments,
        isRecurring: data.isRecurring ?? false,
        recurrenceFreq: data.recurrenceFrequency,
        recurrenceEndDate: data.recurrenceEndDate ? new Date(data.recurrenceEndDate) : null,
        isPinned: data.isPinned ?? false
      },
      include: { comments: true }
    });
    tx.tags = JSON.parse(tx.tags);
    res.json(tx);
  });

  app.put('/api/transactions/:id', async (req, res) => {
    const { comments, ...data } = req.body;

    const updateData: any = {};
    if (data.description !== undefined) updateData.description = data.description;
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.originalAmount !== undefined) updateData.originalAmount = data.originalAmount;
    if (data.originalCurrency !== undefined) updateData.originalCurrency = data.originalCurrency;
    if (data.exchangeRate !== undefined) updateData.exchangeRate = data.exchangeRate;
    if (data.date !== undefined) updateData.date = new Date(data.date);
    if (data.type !== undefined) updateData.type = data.type;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.cardId !== undefined) updateData.cardId = data.cardId;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.tags !== undefined) updateData.tags = JSON.stringify(data.tags);
    if (data.isInstallment !== undefined) updateData.isInstallment = data.isInstallment;
    if (data.installmentId !== undefined) updateData.installmentId = data.installmentId;
    if (data.installmentNumber !== undefined) updateData.installmentNumber = data.installmentNumber;
    if (data.totalInstallments !== undefined) updateData.totalInstallments = data.totalInstallments;
    if (data.isRecurring !== undefined) updateData.isRecurring = data.isRecurring;
    if (data.recurrenceFrequency !== undefined) updateData.recurrenceFreq = data.recurrenceFrequency;
    if (data.recurrenceEndDate !== undefined) updateData.recurrenceEndDate = data.recurrenceEndDate ? new Date(data.recurrenceEndDate) : null;
    if (data.isPinned !== undefined) updateData.isPinned = data.isPinned;

    const tx = await prisma.transaction.update({
      where: { id: req.params.id },
      data: updateData
    });

    if (comments) {
      // Sync comments. This is basic for now.
      await prisma.comment.deleteMany({ where: { transactionId: req.params.id } });
      if (comments.length > 0) {
        await prisma.comment.createMany({
          data: comments.map((c: any) => ({
            text: c.text,
            author: c.author,
            timestamp: new Date(c.timestamp),
            transactionId: req.params.id
          }))
        });
      }
    }

    const updatedTx = await prisma.transaction.findUnique({
      where: { id: req.params.id },
      include: { comments: true }
    });

    if (updatedTx) {
        updatedTx.tags = JSON.parse(updatedTx.tags);
        res.json(updatedTx);
    } else {
        res.status(404).json({ error: 'not found' });
    }
  });

  app.delete('/api/transactions/:id', async (req, res) => {
    await prisma.transaction.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  });

  app.delete('/api/transactions/cleanup', async (req, res) => {
    const { beforeDate } = req.body;
    try {
      const result = await prisma.transaction.deleteMany({
        where: {
          date: {
            lt: new Date(beforeDate)
          }
        }
      });
      res.json({ success: true, count: result.count });
    } catch(e:any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/summary/weekly', async (req, res) => {
    try {
      // Logic for weekly summary would go here.
      // Mocking the email sending process:
      console.log('Sending weekly summary email...');
      res.json({ success: true, message: 'Weekly summary email dispatched to your inbox.' });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/backup/export', async (req, res) => {
    try {
      const fs = require('fs');
      if (fs.existsSync('./dev.db')) {
        res.download('./dev.db', `backup-cc-expense-${new Date().toISOString().split('T')[0]}.sqlite`);
      } else {
        res.status(404).json({ error: 'Database file not found' });
      }
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Profile
  app.get('/api/profile', async (req, res) => {
    const profile = await prisma.userProfile.findFirst();
    res.json(profile);
  });

  app.put('/api/profile', async (req, res) => {
    const { passwordHash, ...data } = req.body;
    let profile = await prisma.userProfile.findFirst();
    let updateData = { ...data };
    if (passwordHash) {
        updateData.passwordHash = passwordHash;
    }
    if (profile) {
      profile = await prisma.userProfile.update({
        where: { id: profile.id },
        data: updateData
      });
    } else {
      profile = await prisma.userProfile.create({ data: updateData });
    }
    res.json(profile);
  });

  // Budgets
  app.get('/api/budgets', async (req, res) => {
    const budgets = await prisma.budget.findMany();
    const formatted = budgets.map(b => ({
      ...b,
      tags: b.tags ? JSON.parse(b.tags) : undefined
    }));
    res.json(formatted);
  });

  app.get('/api/diagnostics', async (req, res) => {
    try {
      const fs = require('fs');
      let dbSize = 0;
      if (fs.existsSync('./dev.db')) {
        const stats = fs.statSync('./dev.db');
        dbSize = stats.size;
      }
      res.json({ status: 'ok', database: 'SQLite (Prisma)', dbSize });
    } catch(e:any) {
      res.status(500).json({ status: 'error', error: e.message });
    }
  });

  app.post('/api/budgets', async (req, res) => {
    const data = req.body;
    const budget = await prisma.budget.create({
      data: {
        category: data.category,
        amount: data.amount,
        tags: data.tags ? JSON.stringify(data.tags) : null,
        period: data.period || 'MONTHLY'
      }
    });
    res.json({ ...budget, tags: budget.tags ? JSON.parse(budget.tags) : undefined });
  });

  app.delete('/api/budgets/:id', async (req, res) => {
    await prisma.budget.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  });


  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
