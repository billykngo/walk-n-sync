import { GoogleGenAI, Modality } from "@google/genai";
import { decode, decodeAudioData } from '../utils/audioUtils';

const getAiClient = (apiKey: string) => {
    if (!apiKey) {
        throw new Error("A Google Gemini API key is required.");
    }
    return new GoogleGenAI({ apiKey });
};

const fileToGenerativePart = async (file: File) => {
    const base64EncodedDataPromise = new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
    });
    return {
        inlineData: {
            data: await base64EncodedDataPromise,
            mimeType: file.type,
        },
    };
};

export const extractTextFromImage = async (geminiApiKey: string, file: File): Promise<string> => {
    try {
        const aiClient = getAiClient(geminiApiKey);
        const imagePart = await fileToGenerativePart(file);
        const textPart = { text: "Extract all text from this image. If there is no text, respond with an empty string." };

        const response = await aiClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [textPart, imagePart] },
        });

        return response.text;
    } catch (error) {
        console.error("Error extracting text from image with Gemini:", error);
        throw new Error("Failed to extract text from the image. Check if the Gemini API key is configured correctly.");
    }
};

export const sanitizeTextForSpeech = async (geminiApiKey: string, text: string): Promise<string> => {
    try {
        const aiClient = getAiClient(geminiApiKey);
        const prompt = `You are an expert at making complex text readable for a text-to-speech engine. 
        Your task is to convert the following text into a version that is easy to read aloud.
        - Describe mathematical equations and formulas in plain English (e.g., 'x^2' becomes 'x squared').
        - Spell out symbols and special characters where appropriate.
        - Do not omit any content, just make it pronounceable.
        - The output should only be the converted text, without any introductory phrases like "Here is the converted text:".
        
        Here is the text to convert:
        ---
        ${text}`;

        const response = await aiClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        return response.text;
    } catch (error) {
        console.error("Error sanitizing text with Gemini:", error);
        // Fallback to original text if sanitization fails to not block the process
        return text;
    }
};

export const generateSpeech = async (geminiApiKey: string, text: string, voiceName: string): Promise<AudioBuffer | null> => {
    try {
        const aiClient = getAiClient(geminiApiKey);
        const response = await aiClient.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: voiceName },
                    },
                },
            },
        });
        
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) {
            console.error("No audio data in Gemini response");
            return null;
        }

        const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const decodedBytes = decode(base64Audio);
        const audioBuffer = await decodeAudioData(decodedBytes, outputAudioContext, 24000, 1);

        return audioBuffer;
    } catch (error) {
        console.error("Error generating speech with Gemini:", error);
        throw new Error("Failed to generate audio. Please check if the Gemini API key is configured and valid.");
    }
};