# Architecture Decision Record (ADR)

## 1. Client-Side File Parsing
**Decision:** We process Office documents (`.docx`, `.xlsx`, `.pptx`) and text files entirely in the user's browser using libraries like `mammoth.js` and `xlsx`.
**Why:** 
- **Privacy:** User data doesn't leave the machine until it is sent securely to the AI API. We do not store raw files on a middle-man server.
- **Cost:** Reduces server bandwidth and storage costs to near zero.
- **Speed:** Immediate feedback without upload latency for the raw binary file.

## 2. Direct-to-Gemini API Integration
**Decision:** The frontend communicates directly with Google's Gemini API via the `@google/genai` SDK.
**Why:**
- **Simplicity:** Removes the need for a Node.js/Python middleware for the MVP.
- **Multimodality:** Gemini accepts Base64 image/PDF data directly, simplifying the pipeline.
- **Trade-off:** API Key is exposed if not careful. *Note: In a production environment, this call should be proxied through a Next.js API route or Edge Function to hide the API Key.*

## 3. Visual PDF Export Strategy
**Decision:** We use `html2canvas` + `jspdf` to screenshot the HTML report and embed it into a PDF, rather than generating a PDF from text strings.
**Why:**
- **Language Support:** JavaScript PDF libraries struggle with complex scripts (Tamil, Hindi, Arabic) and font embedding. Screenshotting ensures *what you see is what you get*.
- **Layout Fidelity:** Preserves the complex grid layouts, images, and styling of the "Deep Insight" report without recreating layout logic in PDF syntax.

## 4. LocalStorage for State Persistence
**Decision:** User sessions, history, and "Premium" status are stored in the browser's `localStorage`.
**Why:**
- **Zero Friction:** Allows users to test the app immediately without setting up a database.
- **Persistence:** Data survives page reloads.
- **Migration Path:** Easy to swap `localStorage` calls with API calls to a database (e.g., Supabase) in Phase 2.

## 5. Sequential AI Execution
**Decision:** When a user requests "Customization" (Translation + Image Gen), we chain promises sequentially rather than using `Promise.all`.
**Why:**
- **Rate Limits:** The Gemini API (Free tier) has strict Requests Per Minute (RPM) limits. Parallel requests trigger `429 Resource Exhausted` errors.
- **Stability:** Sequential execution ensures high reliability, even if it takes 2-3 seconds longer.

## 6. Audio Encoding
**Decision:** We receive raw PCM data from Gemini TTS and wrap it with a WAV header in the browser.
**Why:**
- **Compatibility:** Browsers cannot play raw PCM streams directly.
- **Performance:** Adding a 44-byte WAV header is faster than transcoding audio formats.
