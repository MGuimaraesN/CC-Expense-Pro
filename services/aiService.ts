import { NewsArticle } from '../types';
import { apiClient } from './apiClient';

export const searchFinancialNews = async (query: string): Promise<{ text: string, articles: NewsArticle[] }> => {
  try {
    return await apiClient('/ai/financial-insights', {
       method: 'POST',
       body: JSON.stringify({ query })
    });
  } catch (error) {
    console.error("AI Search Error:", error);
    return { 
      text: "Unable to complete search at this time. Please try again later.", 
      articles: [] 
    };
  }
};