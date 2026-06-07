import React, { useState } from 'react';
import { Transaction, Comment } from '../types';
import { X, Send, MessageSquare } from 'lucide-react';
import { useUpdateTransaction } from '../hooks/useTransactions';

interface CommentsModalProps {
  transaction: Transaction;
  onClose: () => void;
}

export const CommentsModal: React.FC<CommentsModalProps> = ({ transaction, onClose }) => {
  const [commentText, setCommentText] = useState('');
  
  const updateMutation = useUpdateTransaction({
    onSuccess: () => {
      setCommentText('');
    }
  });

  const handleAddComment = () => {
    if (!commentText.trim()) return;
    const newComment: Comment = {
      id: crypto.randomUUID(),
      text: commentText.trim(),
      author: 'Current User', // we could get profile name, mocking it for now
      timestamp: new Date().toISOString()
    };
    const newComments = [...(transaction.comments || []), newComment];
    updateMutation.mutate({ id: transaction.id, comments: newComments });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh] border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
        
        <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <MessageSquare size={18} className="text-indigo-500" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Transaction Notes</h2>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{transaction.description}</p>
          <p className="text-xs text-slate-500 mt-1">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: transaction.currency }).format(transaction.amount)}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {(!transaction.comments || transaction.comments.length === 0) ? (
            <div className="text-center text-slate-500 dark:text-slate-400 py-8 text-sm">
              <MessageSquare size={32} className="mx-auto mb-3 opacity-20" />
              No comments yet.<br/>Leave a note or context here.
            </div>
          ) : (
            transaction.comments.map(c => (
              <div key={c.id} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 relative">
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">{c.author}</span>
                  <span className="text-[10px] text-slate-400">{new Date(c.timestamp).toLocaleString()}</span>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300">{c.text}</p>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex gap-2">
          <input 
            type="text" 
            value={commentText}
            onChange={e => setCommentText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddComment()}
            placeholder="Type a note..."
            className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 dark:text-white"
          />
          <button 
            onClick={handleAddComment}
            disabled={!commentText.trim() || updateMutation.isPending}
            className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
