"use client";

import { useQuery } from '@tanstack/react-query';
import { getDashboardStats } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

function StatCard({ title, value, isLoading }: { title: string; value: string | number; isLoading: boolean }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-3/4" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { data: stats, isLoading, isError, error } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: getDashboardStats,
  });

  const formattedStats = {
    openInvoice: stats?.data.openInvoice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00',
    closedInvoice: stats?.data.closedInvoice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00',
    usedLimit: stats?.data.usedLimit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00',
    totalLimit: stats?.data.totalLimit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00',
  }

  if (isError) {
    return <div className="text-red-500">Error: {error.message}</div>;
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Financial Overview</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Open Invoice" value={formattedStats.openInvoice} isLoading={isLoading} />
        <StatCard title="Closed Invoice" value={formattedStats.closedInvoice} isLoading={isLoading} />
        <StatCard title="Used Limit" value={formattedStats.usedLimit} isLoading={isLoading} />
        <StatCard title="Total Limit" value={formattedStats.totalLimit} isLoading={isLoading} />
      </div>
       {/* Other dashboard components like charts and recent transactions will be added here later */}
    </div>
  );
}
