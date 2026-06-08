import { Router } from 'express';
import { requireAuth } from '../middlewares/requireAuth';
import { GoogleGenAI } from '@google/genai';

const router = Router();

router.post('/financial-insights', requireAuth, async (req, res) => {
   try {
     const { query } = req.body;
     const apiKey = process.env.GEMINI_API_KEY;
     
     if (!apiKey) {
       return res.status(500).json({ 
         text: "API Key is missing. Please configure your environment to use AI features.", 
         articles: [] 
       });
     }

     const ai = new GoogleGenAI({ apiKey });
     
     const response = await ai.models.generateContent({
       model: "gemini-2.5-flash",
       contents: `Find the latest financial news and market trends regarding: "${query}". Provide a summary.`,
       config: {
         tools: [{ googleSearch: {} }],
       },
     });

     const text = response.text || "No summary available.";
     
     // Extract grounding chunks (URLs)
     const articles: any[] = [];
     const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;

     if (groundingChunks) {
       groundingChunks.forEach((chunk: any) => {
         if (chunk.web) {
            articles.push({
              title: chunk.web.title || "News Article",
              url: chunk.web.uri,
              source: chunk.web.source || new URL(chunk.web.uri).hostname,
            });
         }
       });
     }

     res.json({ text, articles });
   } catch (error) {
     console.error("AI Proxy Search Error:", error);
     res.status(500).json({ error: "Failed to generate financial insights." });
   }
});

export default router;
