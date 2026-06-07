# Data Migration Guide: LocalStorage to SQLite (Prisma)

This guide walks you through the process of migrating your existing mock data (previously stored in `localStorage` by `transactionService.ts`) into the newly initialized SQLite database powered by Prisma.

## Background

Previously, the application mocked data directly in the browser using `localStorage`. With the integration of a real backend using Express, SQLite, and Prisma, the existing state stored in `localStorage` under keys such as `cc_expense_transactions`, `cc_expense_user_profile`, and `cc_expense_budgets` has been rendered obsolete, as the `services/*` now perform HTTP calls to `/api/*` to retrieve server-side data.

## Migration Steps (Manual Seeding in Browser)

Since `localStorage` is isolated to the client browser, we cannot directly migrate it using a backend CLI script. However, you can write a simple client-side migration script.

To migrate your existing data from the browser storage into your new SQLite database, follow these steps:

### 1. Execute the Migration Script
Open your browser's Developer Tools (F12 or Right Click -> Inspect => Console) while on the application's URL, and paste the following script. This script will read from `localStorage` and `POST` the data to your new backend.

```javascript
(async function migrateData() {
  const API_BASE = '/api';
  
  console.log("Starting data migration...");

  // 1. Migrate Transactions
  const storedTx = localStorage.getItem('cc_expense_transactions');
  if (storedTx) {
    const transactions = JSON.parse(storedTx);
    console.log(`Found ${transactions.length} transactions. Migrating...`);
    for (const tx of transactions) {
      try {
        await fetch(`${API_BASE}/transactions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tx)
        });
      } catch (err) {
        console.error(`Failed to migrate transaction: ${tx.id}`, err);
      }
    }
    console.log("Transactions migration complete.");
  }

  // 2. Migrate Budgets
  const storedBudgets = localStorage.getItem('cc_expense_budgets');
  if (storedBudgets) {
    const budgets = JSON.parse(storedBudgets);
    console.log(`Found ${budgets.length} budgets. Migrating...`);
    for (const budget of budgets) {
      try {
        await fetch(`${API_BASE}/budgets`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(budget)
        });
      } catch (err) {
        console.error(`Failed to migrate budget: ${budget.id}`, err);
      }
    }
    console.log("Budgets migration complete.");
  }
  
  console.log("Migration finished! You can now clear your localStorage.");
  // Optional: localStorage.removeItem('cc_expense_transactions');
})();
```

### 2. Verify Data
Once the script has finished executing in the browser console, refresh the application page. You should now see your old transactions correctly served from the SQLite database.

## Notes on the Data Model Changes
* The new Prisma generic schema now associates comments to transactions via a relational table (`Comment`).
* The data structures automatically stringify tags and parse them upon return from the backend to comply with SQLite limitations, ensuring compatibility with the existing frontend model interface.
* Recurring transactions and installments generated previously are now individual flat records. Future recurring transaction generation is now handled synchronously in `services/transactionService.ts` before hitting the database.

## Automatic Schema Seeding 
The server now automatically seeds basic generic `UserProfile` (`admin@corp.com` | `123456`) and basic `CreditCard` default states on boot if they are empty.
