import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchTransactions, createTransaction, updateTransaction, deleteTransaction, fetchCards, fetchDashboardStats } from '../services/transactionService';
import { Transaction } from '../types';

interface MutationOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export const useTransactions = () => {
  return useQuery({
    queryKey: ['transactions'],
    queryFn: fetchTransactions,
    retry: 1, // Don't retry too many times for this demo
  });
};

export const useCreateTransaction = (options?: MutationOptions) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      if (options?.onSuccess) options.onSuccess();
    },
    onError: (error) => {
      if (options?.onError) options.onError(error);
    }
  });
};

export const useUpdateTransaction = (options?: MutationOptions) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      if (options?.onSuccess) options.onSuccess();
    },
    onError: (error) => {
      if (options?.onError) options.onError(error);
    }
  });
};

export const useDeleteTransaction = (options?: MutationOptions) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      if (options?.onSuccess) options.onSuccess();
    },
    onError: (error) => {
      if (options?.onError) options.onError(error);
    }
  });
};

export const useCards = () => {
  return useQuery({
    queryKey: ['cards'],
    queryFn: fetchCards,
  });
};

export const useDashboardStats = () => {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: fetchDashboardStats,
  });
};