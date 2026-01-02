
# Project Setup Guide

## Prerequisites

*   **Node.js** (v18 or higher recommended)
*   **Google Gemini API Key** (Get one at [aistudio.google.com](https://aistudiocdn.com/aistudio.google.com))

## Installation & Running

This project is built with React and Vite (implied structure). Since it uses client-side file processing, it is lightweight.

1.  **Install Dependencies**
    ```bash
    npm install
    ```

2.  **Environment Configuration**
    Create a `.env` file in the root directory:
    ```env
    API_KEY=your_gemini_api_key_here
    ```
    *Note: In a production environment, never expose your API Key in client-side code. Use a backend proxy.*

3.  **Start Development Server**
    ```bash
    npm start
    # or
    npm run dev
    ```

4.  **Build for Production**
    ```bash
    npm run build
    ```

## Feature Flags & Customization

*   **Premium Mode:** The app simulates premium status via LocalStorage. To test premium features (Unlimited uploads, Dark themes, Celebrity voices), click the "Upgrade" button in the Settings modal.
*   **Theming:** Custom themes are handled via CSS variables in `index.html`. You can extend `tailwind.config` in `index.html` script tag for more presets.

## Troubleshooting

*   **429 Errors:** If you hit rate limits, the app automatically retries requests sequentially. Consider upgrading your Gemini API tier if this persists.
*   **PDF Parsing:** The app uses a hybrid approach. If a PDF text layer is missing, it falls back to uploading the raw binary for Vision processing (limited to 20MB).
