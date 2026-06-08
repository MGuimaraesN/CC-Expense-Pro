# CC Expense Pro

Sistema SaaS Financeiro B2B focado em gerencimento de faturas, cartões virtuais, dashboard preditivo e insights através de inteligência artificial construído em React 19 + Express.

## Principais Features

- **Multi-Tenant (SaaS)**: Separação isolada a nível transacional entre empresas e assinantes.
- **RBAC (Role Based Access Control)**: Controle de permissões granular a cada recurso listado (Superadmin, Admin, Member, Viewer).
- **Cards Premium**: Interface baseada em gradients tailwind personalizáveis simulando cartões virtuais.
- **Recorrências & Importação**: Controle minucioso em lotes de despesas repetitivas via OFX/CSV upload.
- **Integração AI (Gemini)**: Previsões de fluxo e gastos com Google GenAI e prompts restritos.
- **Auditoria de Sistema**: Registros de Logs granulares não modificáveis cobrindo todo CRUD.
- **Rate Limiting & Segurança JWT**: Failsafes e controles por limitação de IP em end-points.

## Stack & Arquitetura

- **Frontend**: React 19, TypeScript, Zod, Tanstack/react-query, TailwindCSS 4
- **Backend / Serve**: Express 5.0, Node.js + TSX
- **Banco / ORM**: Prisma + SQLite (Desenvolvimento) / PostgreSQL (Produção)

## Como escalar / Rodar em Dev (.env)

Copiar o `.env.example` padrão e prover as chaves:

```bash
NODE_ENV=development
PORT=3000
DATABASE_URL="file:./dev.db"
# Altere obrigatoriamente isso em produção!
JWT_SECRET="change-me-in-production"
JWT_EXPIRES_IN="7d"
CORS_ORIGIN="http://localhost:5173"
# Opcional para o modulo "News & AI"
GEMINI_API_KEY=""
```

## Como Instalar e Rodar

Instalação com React 19 support para peer configs:
```bash
npm install 
```

Gerar Modelos, sincronizar banco e preencher seeds basicos.
```bash
npx prisma generate
npx prisma db push
npm run seed
```

Para desenvolvimento realtime full-stack:
```bash
npm run dev
```

Build unificado para Cloud/Dockerizado (.cjs unico via esbuild + react vite assets):
```bash
npm run build
```

E para iniciar a versao compilada:
```bash
npm run start
```
