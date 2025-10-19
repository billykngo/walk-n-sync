# Content to Audio Streamer

This web application allows you to upload various document and image formats, extracts the text content, and converts it into high-quality audio using Text-to-Speech (TTS) services. The audio is generated in chunks and streamed for a seamless playback experience without long initial loading times.

## Features

-   **Wide File Support:** Upload and process a variety of formats, including:
    -   Images (`JPEG`, `PNG`, `WEBP`)
    -   Documents (`PDF`, `DOCX`, `EPUB`, `PPTX`, and more)
-   **Multiple TTS Providers:** Choose between Google Gemini's high-quality voices or a wide selection from ElevenLabs.
-   **Voice Customization:** Select from different voices and preview them with a sample before generating the full audio.
-   **On-the-Fly Regeneration:** Change the voice or TTS provider and regenerate the audio without re-uploading your file.
-   **Secure API Key Management:** All API keys are stored securely in your browser's local storage and are never exposed.
-   **Audio Playback Controls:** A full-featured audio player with play/pause, seeking, and volume controls.
-   **Downloadable Audio:** Download the final generated audio as a `.mp3` file (encoded as WAV for maximum compatibility).

## How to Run the Application

This project is a client-side application built with React and Tailwind CSS, loaded via CDN. It does not require a complex build process or package installation (like `npm install`).

### Prerequisites

1.  A modern web browser (e.g., Chrome, Firefox, Safari, Edge).
2.  A local web server to serve the files. This is necessary because browsers restrict certain functionalities (like fetching API data) for files opened directly from the local filesystem (`file:///...`).

### Running with a Local Server

You can use any simple web server. Here are two common examples:

**1. Using Python (if you have Python installed):**

-   Open your terminal or command prompt.
-   Navigate to the root directory of this project (where `index.html` is located).
-   Run the following command:
    ```bash
    # For Python 3
    python -m http.server
    ```
-   Open your browser and go to `http://localhost:8000`.

**2. Using Node.js (if you have Node.js and npm installed):**

-   Open your terminal or command prompt.
-   Install the `serve` package globally (you only need to do this once):
    ```bash
    npm install -g serve
    ```
-   Navigate to the root directory of this project.
-   Run the server:
    ```bash
    serve
    ```
-   The terminal will give you a URL, typically `http://localhost:3000`. Open it in your browser.

## API Key Configuration

The application requires API keys for its core functionalities. **All keys are entered via the Settings sidebar within the application itself.** They are then saved to your browser's local storage for future use.

### Required Keys:

1.  **Google Gemini API Key:**
    -   **Purpose:** Used for text extraction from images, text sanitization, and as the primary TTS provider.
    -   **Get your key:** Visit [Google AI Studio](https://aistudio.google.com/app/apikey) to create your API key.

2.  **ElevenLabs API Key (Optional):**
    -   **Purpose:** Used as an alternative, high-quality TTS provider with a wide range of voices.
    -   **Get your key:** Sign up on the [ElevenLabs website](https://elevenlabs.io/). Your API key can be found in your profile settings.

3.  **Mathpix API Keys (Optional):**
    -   **Purpose:** Used for advanced text extraction from documents like `DOCX`, `EPUB`, and complex `PDF` files.
    -   **Get your keys:** You will need both an **App ID** and an **App Key**. Sign up on the [Mathpix Portal](https://accounts.mathpix.com/signup).

### How to Add Keys to the App:

1.  Run the application and open it in your browser.
2.  Click the menu icon on the top-left to open the **Settings** sidebar.
3.  Under the "API Keys" section, enter each key into its corresponding input field.
4.  The keys will be saved automatically as you type.
