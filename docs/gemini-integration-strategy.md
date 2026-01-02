# Gemini API Integration Strategy

Deep Insight utilizes the Google Gemini API for three distinct modalities. Here is the configuration breakdown.

## 1. Text & Vision Analysis
*   **Model:** `gemini-2.5-flash`
*   **Input:** 
    *   Base64 encoded string (PDF/Image) OR
    *   Raw Text string (Office/Text files).
*   **Config:**
    *   `responseSchema`: We use a strict JSON schema (defined in `services/geminiService.ts`) to force the model to return structured data (Summaries, Insights array, Mermaid syntax).
    *   `temperature`: `0.2` (Low temperature for factual accuracy and reduced hallucination).

## 2. Visual Concept Generation
*   **Model:** `gemini-2.5-flash-image`
*   **Prompt Strategy:**
    *   We generate 3 distinct prompts programmatically based on the short summary.
    *   Styles: "Digital Art", "Minimalist Data Viz", "Futuristic Cyberpunk".
*   **Retry Logic:** 
    *   Image generation occasionally fails with `500` errors due to server load. We implemented an exponential backoff retry mechanism in `generateConceptImages`.

## 3. Text-to-Speech (TTS)
*   **Model:** `gemini-2.5-flash-preview-tts`
*   **Configuration:**
    *   `responseModalities`: `['AUDIO']`
    *   `voiceConfig`: We map our UI personas (e.g., "Vin Diesel") to specific Gemini voice IDs (e.g., `Charon`, `Puck`).
*   **Output Handling:**
    *   The API returns base64 encoded PCM (Pulse Code Modulation) data.
    *   We define a `createWavHeader` utility to prepend a RIFF/WAVE header so the browser's `<audio>` element can play it.

## 4. Context-Aware Chat
*   **Model:** `gemini-2.5-flash`
*   **Context Management:**
    *   We inject the `extractedText` as a System Instruction or initial context.
    *   We append the chat history (`User: ...`, `AI: ...`) to maintain conversation continuity.
