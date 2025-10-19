import { Voice } from '../types';

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

export const verifyElevenLabsApiKey = async (apiKey: string): Promise<boolean> => {
    if (!apiKey) return false;
    
    try {
        const response = await fetch(`${ELEVENLABS_API_URL}/user`, {
            headers: { 'xi-api-key': apiKey },
        });

        if (response.ok) return true;
        if (response.status === 401) return false;
        
        // For other errors (network, server issues), treat as invalid for the user.
        return false;
    } catch (error) {
        console.error("Error verifying ElevenLabs API key:", error);
        return false;
    }
};

export const getElevenLabsVoices = async (apiKey: string): Promise<Voice[]> => {
    if (!apiKey) {
        throw new Error('An ElevenLabs API key is required to fetch voices.');
    }
    const response = await fetch(`${ELEVENLABS_API_URL}/voices`, {
        headers: {
            'xi-api-key': apiKey,
        },
    });

    if (!response.ok) {
        if (response.status === 401) {
            throw new Error('The provided ElevenLabs API Key is invalid.');
        }
        throw new Error('Failed to fetch ElevenLabs voices. Please check the API key and your connection.');
    }

    const data = await response.json();
    return data.voices.map((v: any) => ({
        id: v.voice_id,
        name: v.name,
    }));
};


export const generateElevenLabsSpeech = async (
    apiKey: string,
    text: string,
    voiceId: string,
): Promise<AudioBuffer | null> => {
    if (!apiKey) {
        throw new Error("An ElevenLabs API key is required to generate speech.");
    }

    try {
        const url = `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}?output_format=mp3_44100_128`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'audio/mpeg',
                'xi-api-key': apiKey,
            },
            body: JSON.stringify({
                text: text,
                model_id: 'eleven_multilingual_v2',
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75,
                },
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            try {
                const errorData = JSON.parse(errorText);
                throw new Error(`ElevenLabs API Error: ${errorData.detail?.message || 'Failed to generate speech.'}`);
            } catch (e) {
                 throw new Error(`ElevenLabs API Error: ${response.status} ${response.statusText}`);
            }
        }

        const audioArrayBuffer = await response.arrayBuffer();
        
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const audioBuffer = await audioContext.decodeAudioData(audioArrayBuffer);
        
        return audioBuffer;
    } catch (error) {
        console.error("Error generating speech with ElevenLabs:", error);
        throw error;
    }
};