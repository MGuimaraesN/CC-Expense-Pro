
// For now, this service will return mock data similar to the original frontend service.
// A full implementation would involve complex database queries.

interface DashboardStats {
  openInvoice: number;
  closedInvoice: number;
  totalLimit: number;
  usedLimit: number;
  monthlyTrend: { month: string; amount: number }[];
}

export const getDashboardStats = async (userId: string): Promise<DashboardStats> => {
  // Mocked data for demonstration
  return {
    openInvoice: 3450.20,
    closedInvoice: 1200.00,
    totalLimit: 65000,
    usedLimit: 14500,
    monthlyTrend: [
      { month: 'Jan', amount: 4000 },
      { month: 'Feb', amount: 3000 },
      { month: 'Mar', amount: 5000 },
      { month: 'Apr', amount: 2780 },
      { month: 'May', amount: 1890 },
      { month: 'Jun', amount: 2390 },
    ]
  };
};
