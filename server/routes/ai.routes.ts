import { Router } from 'express';
import { requireAuth } from '../middlewares/requireAuth';
import { validateBody } from '../middlewares/validate';
import { z } from 'zod';
import { GoogleGenAI } from '@google/genai';
import { prisma } from '../services/prisma';

const router = Router();

const aiSchema = z.object({
  query: z.string().min(1).max(500)
});

router.post('/financial-insights', requireAuth, validateBody(aiSchema), async (req: any, res: any) => {
   try {
     const { query } = req.body;
     const apiKey = process.env.GEMINI_API_KEY;
     
     // Log action for AI usage
     await prisma.auditLog.create({
        data: { tenantId: req.user.tenantId, userId: req.user.id, action: 'USE_AI_INSIGHTS', entity: 'System', metadata: JSON.stringify({ query }) }
     });

     if (!apiKey) {
       return res.status(503).json({ 
         text: "AI capabilities are temporarily disabled due to missing configuration.", 
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
         if (chunk.web && chunk.web.uri) {
            articles.push({
              title: chunk.web.title || "News Article",
              url: chunk.web.uri,
              source: new URL(chunk.web.uri).hostname,
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
