import { GoogleGenAI, Type, Modality } from "@google/genai";
import { AnalysisResult, KeyInsight, ChatMessage, QuizQuestion } from "../types";

// Initialize the client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Helper to attempt repairing truncated JSON
 */
const repairJson = (jsonStr: string): string => {
    let cleanStr = jsonStr.trim();
    
    // If it ends correctly, return
    if (cleanStr.endsWith('}')) return cleanStr;

    // Fix for "Unterminated string" error at end of file
    const lastChar = cleanStr.slice(-1);
    const lastQuote = cleanStr.lastIndexOf('"');
    const lastBrace = cleanStr.lastIndexOf('}');
    
    if (lastQuote > lastBrace) {
        cleanStr += '"';
    }

    const lastComma = cleanStr.lastIndexOf(',');
    const lastBracket = cleanStr.lastIndexOf(']');
    
    try {
        JSON.parse(cleanStr + '}');
        return cleanStr + '}';
    } catch(e) {
        if (lastComma > lastBrace && lastComma > lastBracket) {
             return cleanStr.substring(0, lastComma) + '}';
        }
    }

    if (!cleanStr.endsWith('"') && !cleanStr.endsWith('}') && !cleanStr.endsWith(']')) {
        cleanStr += '"';
    }
    return cleanStr + '}'; 
};

/**
 * Analyzes the document (Image, PDF, or Text) to extract text, summaries, and insights.
 * Includes retry logic for stability.
 */
export const analyzeDocument = async (
  base64Data: string,
  mimeType: string,
  isPremium: boolean = false,
  useLite: boolean = false
): Promise<AnalysisResult> => {
  
  // Update model name to correct alias for 'gemini lite'
  const model = useLite ? 'gemini-flash-lite-latest' : 'gemini-2.5-flash'; 

  // Schema for structured output
  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      extractedText: {
        type: Type.STRING,
        description: "The raw text extracted. IMPORTANT: If the document is very long (over 10 pages), provide a truncated version here (first 5000 chars) to prevent JSON errors. Do not list long sequences of numbers.",
      },
      shortSummary: {
        type: Type.STRING,
        description: "A concise 2-3 sentence summary of the document.",
      },
      mediumSummary: {
        type: Type.STRING,
        description: "A 1-2 paragraph summary covering the main ideas.",
      },
      longSummary: {
        type: Type.STRING,
        description: isPremium 
            ? "A highly detailed, deep-dive analysis (at least 600 words) broken into clear sections, including methodology, findings, and conclusions." 
            : "A detailed, multi-section summary of the entire document.",
      },
      insights: {
        type: Type.ARRAY,
        description: isPremium ? "Top 15 key strategic insights and actionable takeaways." : "Top 10 key learning points/insights.",
        items: {
          type: Type.OBJECT,
          properties: {
            point: { type: Type.STRING, description: "The key insight." },
            reference: { type: Type.STRING, description: "A short quote or context from the text proving this insight." }
          }
        }
      },
      diagramDefinition: {
        type: Type.STRING,
        description: "A valid Mermaid.js graph/flowchart definition string representing the structure or key concepts of the document. Use 'graph TD' or 'mindmap'. Do not include markdown code blocks.",
      }
    },
    required: ["extractedText", "shortSummary", "mediumSummary", "longSummary", "insights"]
  };

  const attemptAnalysis = async (retryCount = 0): Promise<AnalysisResult> => {
    try {
      // Premium users get a more analytical system prompt
      const systemInstruction = isPremium 
        ? "You are an elite research analyst. Perform a deep strategic analysis. Focus on nuances, hidden implications, and actionable data. Provide extensive detail in the Long Summary. CRITICAL: When extracting text from tables, grids, or plot lists, SUMMARIZE the data ranges (e.g. 'Plots 200-500'). DO NOT list thousands of sequential items. For 'extractedText', if the doc is massive, truncate it to the most relevant parts to ensure valid JSON output."
        : "Analyze this document concisely. Extract full text, generate summaries, and identify key insights. CRITICAL: Do not output repetitive lists (like 'Plot 1, Plot 2... Plot 1000'). Summarize ranges (e.g. 'Plots 1-1000') instead.";

      const result = await ai.models.generateContent({
        model: model,
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Data
              }
            },
            {
              text: `
                ${systemInstruction}
                1. Extract the content. If there are massive lists of numbers/names/plots, summarize them (e.g. "Includes plots 100 through 500") instead of listing every single one.
                2. Generate 3 levels of summaries.
                3. Identify key insights/learnings.
                4. Create a Mermaid.js diagram definition.
                
                CRITICAL: Do not hallucinate. If the document is illegible, indicate that in the extracted text.
                IMPORTANT: Ensure the JSON response is complete and valid. Do not cut off strings.
              `
            }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: responseSchema,
          temperature: 0.2, 
        }
      });

      let jsonText = result.text;
      if (!jsonText) throw new Error("No response from AI");

      // Robust JSON Cleanup
      const firstBrace = jsonText.indexOf('{');
      const lastBrace = jsonText.lastIndexOf('}');

      if (firstBrace !== -1 && lastBrace !== -1) {
          jsonText = jsonText.substring(firstBrace, lastBrace + 1);
      } else {
          jsonText = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();
      }

      let data;
      try {
        data = JSON.parse(jsonText);
      } catch (parseError) {
        console.warn("Initial JSON Parse failed, attempting repair...", parseError);
        try {
            // Attempt to repair truncated JSON
            const repaired = repairJson(jsonText);
            data = JSON.parse(repaired);
        } catch (repairError) {
            console.error("JSON Repair failed:", repairError);
            throw new Error("Failed to parse analysis result. The AI output might have been interrupted due to excessive length. Please try again or use a smaller document.");
        }
      }

      // Calculate word count and reading time locally based on extracted text
      const wordCount = (data.extractedText || "").split(/\s+/).length;
      const readingTimeMinutes = Math.ceil(wordCount / 200); // Avg reading speed

      // Safety Fallbacks to prevent crashes
      return {
        ...data,
        insights: Array.isArray(data.insights) ? data.insights : [],
        shortSummary: data.shortSummary || "",
        mediumSummary: data.mediumSummary || "",
        longSummary: data.longSummary || "",
        extractedText: data.extractedText || "",
        wordCount,
        readingTimeMinutes
      };

    } catch (error: any) {
      if (error.message?.includes("exceeds supported limit") || error.message?.includes("Document size")) {
          throw new Error("Document is too large for AI analysis. Please try a smaller file or a text-based PDF.");
      }

      if (error.status === 400 && retryCount === 0) {
          throw new Error("File could not be processed. It might be corrupted or in an unsupported format.");
      }

      if ((error.status === 429 || error.status === 503) && retryCount < 3) {
        // Increased sleep duration for better reliability
        const waitTime = 5000 * (retryCount + 1);
        console.warn(`Rate limit/Server error (Attempt ${retryCount + 1}). Retrying in ${waitTime/1000}s...`);
        await sleep(waitTime);
        return attemptAnalysis(retryCount + 1);
      }
      
      if (retryCount < 2) {
        const waitTime = 5000 * (retryCount + 1);
        console.warn(`Attempt ${retryCount + 1} failed. Retrying in ${waitTime/1000}s...`, error);
        await sleep(waitTime);
        return attemptAnalysis(retryCount + 1);
      }
      console.error("Analysis Error after retries:", error);
      throw error;
    }
  };

  return attemptAnalysis();
};

/**
 * Translates text into the target language using Gemini.
 */
export const translateText = async (text: string, targetLanguage: string): Promise<string> => {
  if (!text) return "";
  if (targetLanguage === 'English') return text;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [{
          text: `You are a professional translator. Translate the following text into ${targetLanguage}. 
          IMPORTANT: Return ONLY the translated text. Do not add explanations. Maintain the original tone.
          
          Text to translate:
          ${text.slice(0, 30000)}` // Limit for translation to prevent timeouts
        }]
      }
    });

    return response.text || text;
  } catch (error) {
    console.error("Translation Error:", error);
    return text; // Fallback to original
  }
};

/**
 * Generates conceptual images based on summary.
 */
export const generateConceptImages = async (summary: string, count: number = 1): Promise<string[]> => {
  if (!summary) return [];
  const runGeneration = async (prompt: string, retries = 0): Promise<string | null> => {
     try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: prompt }] },
            config: {}
        });
        
        if (response.candidates && response.candidates[0].content.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    return `data:image/png;base64,${part.inlineData.data}`;
                }
            }
        }
        return null;
     } catch (err) {
         if (retries < 3) {
             // Increased sleep duration
             await sleep(5000); 
             return runGeneration(prompt, retries + 1);
         }
         return null;
     }
  };

  try {
    const basePrompt = summary.slice(0, 300).replace(/\n/g, ' ');
    // Generate varied prompts for a gallery feel
    const prompts = [
        `High-quality digital illustration, photorealistic 4k, clean composition: "${basePrompt}"`,
        `Modern minimalist infographic style, data visualization art, sleek vector style: "${basePrompt}"`,
        `Futuristic cyberpunk concept art, neon lighting, highly detailed: "${basePrompt}"`,
        `Abstract editorial illustration, corporate art style, flat design, vibrant colors: "${basePrompt}"`
    ];

    const promises = [];
    for(let i=0; i<count; i++) {
        promises.push(runGeneration(prompts[i % prompts.length]));
    }

    const results = await Promise.all(promises);
    return results.filter(img => img !== null) as string[];
    
  } catch (error) {
    console.error("Image Generation Error:", error);
    return [];
  }
};

export const generateConceptImage = async (summary: string): Promise<string | null> => {
    const images = await generateConceptImages(summary, 1);
    return images.length > 0 ? images[0] : null;
}

/**
 * Ask AI - Document Q&A
 */
export const askDocument = async (
  documentText: string, 
  history: ChatMessage[], 
  question: string,
  enableThinking: boolean = false
): Promise<string> => {
  if (!documentText) return "No document content available.";
  
  const model = enableThinking ? 'gemini-3-pro-preview' : 'gemini-2.5-flash';
  
  const config: any = {};
  if (enableThinking) {
      config.thinkingConfig = { thinkingBudget: 32768 };
      // Do NOT set maxOutputTokens when thinkingBudget is maxed out/used for deep reasoning
  }

  try {
    const historyText = history.map(h => `${h.role === 'user' ? 'User' : 'AI'}: ${h.text}`).join('\n');
    
    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [{
          text: `
            You are an intelligent assistant helping a user understand a document.
            
            Document Content:
            """${documentText.slice(0, 30000)}...""" (truncated if too long)
            
            Conversation History:
            ${historyText}
            
            User Question: ${question}
            
            Instructions:
            1. Answer the user's question accurately based ONLY on the Document Content.
            2. If the answer is not in the document, politely say "I cannot find that information in the document."
            3. Keep your answer concise unless asked for detail.
          `
        }]
      },
      config: config
    });

    return response.text || "I'm sorry, I couldn't generate an answer.";
  } catch (error) {
    console.error("Ask AI Error:", error);
    return "I encountered an error trying to answer that. Please try again.";
  }
};

/**
 * Transcribe Audio (Speech to Text)
 */
export const transcribeAudio = async (audioBase64: string, mimeType: string = 'audio/wav'): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [{
          inlineData: {
            mimeType: mimeType,
            data: audioBase64
          }
        }, {
           text: "Transcribe the spoken audio into text exactly as it sounds. Do not add any commentary."
        }]
      }
    });
    return response.text || "";
  } catch (error) {
    console.error("Transcription error:", error);
    throw error;
  }
};

/**
 * Generates a 5-question quiz.
 */
export const generateQuiz = async (extractedText: string): Promise<QuizQuestion[]> => {
    if (!extractedText) return [];
    const responseSchema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                question: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctAnswerIndex: { type: Type.INTEGER },
                explanation: { type: Type.STRING }
            },
            required: ['question', 'options', 'correctAnswerIndex', 'explanation']
        }
    };

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [{
                    text: `Generate a 5-question multiple choice quiz based on the following text to test the user's understanding.
                    
                    Text:
                    "${extractedText.slice(0, 10000)}..."
                    `
                }]
            },
            config: {
                responseMimeType: 'application/json',
                responseSchema: responseSchema,
                temperature: 0.3
            }
        });

        let text = response.text;
        if (text) {
             const firstBrace = text.indexOf('[');
             const lastBrace = text.lastIndexOf(']');
             if (firstBrace !== -1 && lastBrace !== -1) {
                 text = text.substring(firstBrace, lastBrace + 1);
             } else {
                 text = text.replace(/```json/g, '').replace(/```/g, '').trim();
             }

             try {
                 return JSON.parse(text) as QuizQuestion[];
             } catch (e) {
                 console.error("Quiz JSON parse error", e);
                 return [];
             }
        }
        return [];
    } catch (error) {
        console.error("Quiz Generation Error:", error);
        return [];
    }
}

// --- Audio Helper Functions ---

const writeString = (view: DataView, offset: number, string: string) => {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
};

const createWavHeader = (dataLength: number, sampleRate: number = 24000, numChannels: number = 1, bitsPerSample: number = 16): Uint8Array => {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true);
  view.setUint16(32, numChannels * (bitsPerSample / 8), true);
  view.setUint16(34, bitsPerSample, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);

  return new Uint8Array(header);
};

export const generateAudio = async (text: string, voiceName: string = 'Kore'): Promise<string> => {
  if (!text || text.trim().length === 0) {
    throw new Error("Text is empty, cannot generate audio.");
  }

  const voice = voiceName || 'Kore';

  // 1. Robust Text Cleaning
  // Aggressively remove characters that confuse TTS engines or trigger safety filters
  const cleanText = text
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/https?:\/\/[^\s]+/g, ' link ') // Replace URLs
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}]/gu, '') // Remove Emojis
    .replace(/[*#_`~\[\]{}()]/g, '') // Remove special chars commonly found in markdown/code
    .replace(/\s+/g, ' ')   // Collapse whitespace
    .trim();

  // 2. Optimized Chunking for Rate Limits (RPM)
  // 2000 chars is safe for Gemini context and reduces the number of requests significantly (improving RPM)
  const MAX_CHUNK_SIZE = 2000; 
  
  const chunks: string[] = [];
  let remaining = cleanText;
  
  while (remaining.length > 0) {
    if (remaining.length <= MAX_CHUNK_SIZE) {
        chunks.push(remaining);
        break;
    }
    
    let splitIdx = -1;
    const window = remaining.slice(0, MAX_CHUNK_SIZE);
    
    // Priority split points (Punctuation)
    const splitChars = ['. ', '! ', '? ', '; ', ': '];
    
    for (const char of splitChars) {
        const idx = window.lastIndexOf(char);
        if (idx > MAX_CHUNK_SIZE * 0.6) { // Try to split in the latter half
            splitIdx = idx + char.length;
            break;
        }
    }
    
    // Fallback to space
    if (splitIdx === -1) {
        const sIdx = window.lastIndexOf(' ');
        if (sIdx > MAX_CHUNK_SIZE * 0.6) splitIdx = sIdx + 1;
    }
    
    // Hard split if absolutely necessary
    if (splitIdx === -1) splitIdx = MAX_CHUNK_SIZE;
    
    chunks.push(remaining.slice(0, splitIdx));
    remaining = remaining.slice(splitIdx).trim();
  }

  const audioParts: Uint8Array[] = [];

  // Helper with smart rate-limit backoff for generating a specific text segment
  const generateSegment = async (segmentText: string, attempt = 1): Promise<Uint8Array | null> => {
     if (!segmentText.trim()) return null;

     try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: segmentText }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: voice },
                    },
                },
            },
        });

        const base64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64) {
             const binaryString = window.atob(base64);
             const len = binaryString.length;
             const bytes = new Uint8Array(len);
             for (let k = 0; k < len; k++) {
                bytes[k] = binaryString.charCodeAt(k);
             }
             return bytes;
        }
        return null;
     } catch (e: any) {
        const msg = e.message || JSON.stringify(e);
        const isRateLimit = 
            e.status === 429 || 
            e.response?.status === 429 ||
            (e.error && e.error.code === 429) ||
            msg.includes('429') || 
            msg.includes('exhausted') || 
            msg.includes('quota');
        
        // Retry Strategy
        if (attempt <= 3) {
             // On Rate Limit: Wait significantly longer (10s, 20s, 30s) to allow quota to reset
             // On Other Error: Wait standard (2s, 4s, 6s)
             const baseDelay = isRateLimit ? 10000 : 2000;
             const delay = baseDelay * attempt;
             
             console.warn(`TTS Attempt ${attempt} failed. Retrying in ${delay/1000}s...`, isRateLimit ? '(Rate Limit Hit)' : msg);
             await sleep(delay);
             return generateSegment(segmentText, attempt + 1);
        }
        
        console.error(`TTS Failed after ${attempt} attempts.`, e);
        throw new Error(isRateLimit ? "Audio generation quota exceeded. Please wait a minute and try again." : "Failed to generate audio.");
     }
  };

  // Execution Loop - Strictly Sequential
  for (let i = 0; i < chunks.length; i++) {
     const chunk = chunks[i];
     
     // Cool-down spacing between chunks to be kind to RPM
     if (i > 0) await sleep(2000); 

     let bytes = await generateSegment(chunk);
     
     if (!bytes) {
         console.warn(`Chunk ${i} failed. Skipping.`);
         // We continue to next chunk rather than failing completely if one part is missing, 
         // though audio might be disjointed.
     } else {
         audioParts.push(bytes);
     }
  }

  if (audioParts.length === 0) {
      throw new Error("Unable to generate audio. The content may be restricted or the API is overloaded.");
  }

  // Combine and Return WAV
  const totalLen = audioParts.reduce((acc, b) => acc + b.length, 0);
  const combined = new Uint8Array(totalLen);
  let offset = 0;
  for (const part of audioParts) {
      combined.set(part, offset);
      offset += part.length;
  }
  
  try {
      const wavHeader = createWavHeader(combined.length, 24000, 1, 16);
      const blob = new Blob([wavHeader, combined], { type: 'audio/wav' });
      return URL.createObjectURL(blob);
  } catch (err) {
      throw new Error("Failed to assemble audio file.");
  }
};