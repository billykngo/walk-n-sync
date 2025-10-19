import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { TtsProvider, Voice } from '../types';
import { getElevenLabsVoices, generateElevenLabsSpeech } from '../services/elevenLabsService';
import { generateSpeech as generateGeminiSpeech } from '../services/geminiService';

// Hardcoded Gemini voices for selection
const geminiVoices: Voice[] = [
    { id: 'Kore', name: 'Kore (Female)' },
    { id: 'Puck', name: 'Puck (Male)' },
    { id: 'Zephyr', name: 'Zephyr (Female)' },
    { id: 'Charon', name: 'Charon (Male)' },
    { id: 'Fenrir', name: 'Fenrir (Male)' },
];

const StarIcon = ({ isFilled }: { isFilled: boolean }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isFilled ? 'text-yellow-400' : 'text-gray-400'}`} fill={isFilled ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
);

interface VoicePanelProps {
    isOpen: boolean;
    onClose: () => void;
    ttsProvider: TtsProvider;
    setTtsProvider: (provider: TtsProvider) => void;
    selectedVoice: string;
    setSelectedVoice: (voiceId: string) => void;
    isDisabled: boolean;
    onRegenerate: () => void;
    hasExtractedText: boolean;
    favoriteVoices: string[];
    onToggleFavorite: (voiceId: string) => void;
    geminiApiKey: string;
    elevenLabsApiKey: string;
    elevenLabsKeyStatus: 'unverified' | 'verifying' | 'valid' | 'invalid';
}

const VoicePanel: React.FC<VoicePanelProps> = ({
    isOpen,
    onClose,
    ttsProvider,
    setTtsProvider,
    selectedVoice,
    setSelectedVoice,
    isDisabled,
    onRegenerate,
    hasExtractedText,
    favoriteVoices,
    onToggleFavorite,
    geminiApiKey,
    elevenLabsApiKey,
    elevenLabsKeyStatus
}) => {
    const [elevenLabsVoices, setElevenLabsVoices] = useState<Voice[]>([]);
    const [isLoadingVoices, setIsLoadingVoices] = useState(false);
    const [voiceError, setVoiceError] = useState<string | null>(null);

    const [playingSampleId, setPlayingSampleId] = useState<string | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

    const stopCurrentSample = useCallback(() => {
        if (sourceNodeRef.current) {
            try { sourceNodeRef.current.stop(); } catch (e) { /* Already stopped */ }
            sourceNodeRef.current.disconnect();
            sourceNodeRef.current = null;
        }
        setPlayingSampleId(null);
    }, []);

    const handlePlaySample = async (voiceId: string) => {
        if (playingSampleId === voiceId) {
            stopCurrentSample();
            return;
        }

        if (sourceNodeRef.current) {
            stopCurrentSample();
        }

        setPlayingSampleId(voiceId);
        setVoiceError(null);

        try {
            const sampleText = "This is a sample sentence of my reading";
            let audioBuffer: AudioBuffer | null = null;

            if (ttsProvider === 'gemini') {
                audioBuffer = await generateGeminiSpeech(geminiApiKey, sampleText, voiceId);
            } else {
                audioBuffer = await generateElevenLabsSpeech(elevenLabsApiKey, sampleText, voiceId);
            }

            if (audioBuffer) {
                if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
                    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
                } else if (audioContextRef.current.state === 'suspended') {
                    await audioContextRef.current.resume();
                }
                
                const source = audioContextRef.current.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(audioContextRef.current.destination);
                
                source.onended = () => {
                    if (sourceNodeRef.current === source) {
                        setPlayingSampleId(null);
                        sourceNodeRef.current = null;
                    }
                };
                
                source.start(0);
                sourceNodeRef.current = source;
            } else {
                 throw new Error("Generated audio sample was empty.");
            }
        } catch (err) {
            console.error("Error playing sample:", err);
            const errorMessage = err instanceof Error ? err.message : "Could not play the audio sample.";
            setVoiceError(errorMessage);
            setPlayingSampleId(null);
        }
    };

    // Cleanup audio resources on component unmount
    useEffect(() => {
        return () => {
            stopCurrentSample();
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
        };
    }, [stopCurrentSample]);

    // Effect to fetch ElevenLabs voices when provider/key changes
    useEffect(() => {
        stopCurrentSample();

        if (ttsProvider !== 'elevenlabs') {
            setElevenLabsVoices([]);
            setVoiceError(null);
            return;
        }
        
        setElevenLabsVoices([]); // Clear previous voices on any change

        if (elevenLabsKeyStatus === 'invalid') {
            setVoiceError("The provided ElevenLabs API Key is invalid. Please correct it in the settings panel.");
            setIsLoadingVoices(false);
        } else if (elevenLabsKeyStatus === 'verifying') {
            setVoiceError(null);
            setIsLoadingVoices(true);
        } else if (!elevenLabsApiKey) { // Covers 'unverified'
            setVoiceError("Please enter an ElevenLabs API key to see available voices.");
            setIsLoadingVoices(false);
        } else if (elevenLabsKeyStatus === 'valid') {
            const fetchVoices = async () => {
                setIsLoadingVoices(true);
                setVoiceError(null);
                try {
                    const voices = await getElevenLabsVoices(elevenLabsApiKey);
                    setElevenLabsVoices(voices);
                    if (voices.length > 0 && !voices.some(v => v.id === selectedVoice)) {
                        setSelectedVoice(voices[0].id);
                    } else if (voices.length === 0) {
                        setSelectedVoice('');
                        setVoiceError("No ElevenLabs voices were found for this API key.");
                    }
                } catch (err) {
                    setVoiceError(err instanceof Error ? err.message : 'An unknown error occurred.');
                    setSelectedVoice('');
                } finally {
                    setIsLoadingVoices(false);
                }
            };
            fetchVoices();
        }
    }, [ttsProvider, elevenLabsApiKey, setSelectedVoice, stopCurrentSample, elevenLabsKeyStatus, selectedVoice]);

    const handleProviderChange = (provider: TtsProvider) => {
        stopCurrentSample();
        setTtsProvider(provider);
        if (provider === 'gemini') {
            setSelectedVoice('Kore');
        } else {
            // Clear the voice. The useEffect will fetch and set a new default.
            setSelectedVoice('');
        }
    };
    
    const { favoriteList, otherList } = useMemo(() => {
        const allVoices = ttsProvider === 'gemini' ? geminiVoices : elevenLabsVoices;
        const favorites: Voice[] = [];
        const others: Voice[] = [];

        allVoices.forEach(voice => {
            if (favoriteVoices.includes(voice.id)) {
                favorites.push(voice);
            } else {
                others.push(voice);
            }
        });
        
        favorites.sort((a, b) => a.name.localeCompare(b.name));
        others.sort((a, b) => a.name.localeCompare(b.name));

        return { favoriteList: favorites, otherList: others };
    }, [ttsProvider, elevenLabsVoices, favoriteVoices]);

    const renderVoiceItem = (voice: Voice) => {
        const isFavorite = favoriteVoices.includes(voice.id);
        return (
            <div key={voice.id} className="flex items-center space-x-2">
                <button
                    onClick={() => onToggleFavorite(voice.id)}
                    disabled={isDisabled}
                    className="p-2 rounded-full hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    aria-label={isFavorite ? `Unfavorite ${voice.name}` : `Favorite ${voice.name}`}
                >
                    <StarIcon isFilled={isFavorite} />
                </button>
                <button
                    onClick={() => setSelectedVoice(voice.id)}
                    disabled={isDisabled}
                    className={`flex-1 text-left p-3 rounded-md transition-colors text-sm ${selectedVoice === voice.id ? 'bg-cyan-600 font-semibold' : 'bg-gray-700 hover:bg-gray-600'}`}
                >
                    {voice.name}
                </button>
                <button
                    onClick={() => handlePlaySample(voice.id)}
                    disabled={isDisabled || (playingSampleId !== null && playingSampleId !== voice.id)}
                    className="p-2 rounded-full bg-gray-600 hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-opacity-75 flex-shrink-0"
                    aria-label={`Play sample for ${voice.name}`}
                >
                    {playingSampleId === voice.id ? (
                        <svg fill="currentColor" viewBox="0 0 16 16" className="h-5 w-5">
                          <path d="M5 3.5h6A1.5 1.5 0 0 1 12.5 5v6a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 11V5A1.5 1.5 0 0 1 5 3.5z"/>
                        </svg>
                    ) : (
                        <svg fill="currentColor" viewBox="0 0 16 16" className="h-5 w-5">
                          <path d="M11.596 8.697l-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/>
                        </svg>
                    )}
                </button>
            </div>
        );
    };

    return (
        <>
            <div className={`fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={onClose}></div>
            <aside className={`fixed inset-y-0 left-0 z-50 w-80 bg-gray-800 text-white transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} shadow-2xl flex flex-col`}>
                <div className="flex items-center justify-between p-4 border-b border-gray-700">
                    <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">Voice Settings</h2>
                    <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-gray-700">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="flex-1 p-4 overflow-y-auto space-y-6">
                    <div>
                        <h3 className="font-semibold mb-2 text-gray-300">TTS Provider</h3>
                        <div className="flex bg-gray-900 rounded-md p-1">
                            <button
                                onClick={() => handleProviderChange('gemini')}
                                disabled={isDisabled}
                                className={`flex-1 p-2 rounded text-sm font-medium transition-colors ${ttsProvider === 'gemini' ? 'bg-cyan-600' : 'hover:bg-gray-700'}`}
                            >
                                Google Gemini
                            </button>
                            <button
                                onClick={() => handleProviderChange('elevenlabs')}
                                disabled={isDisabled}
                                className={`flex-1 p-2 rounded text-sm font-medium transition-colors ${ttsProvider === 'elevenlabs' ? 'bg-cyan-600' : 'hover:bg-gray-700'}`}
                            >
                                ElevenLabs
                            </button>
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        <h3 className="font-semibold text-gray-300">Select Voice</h3>
                        <div className="max-h-96 overflow-y-auto space-y-2 pr-2">
                            {isLoadingVoices && <div className="text-gray-400 text-sm flex items-center"><svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Loading voices...</div>}
                            
                            {voiceError && <p className="text-red-400 text-sm p-3 bg-red-900/30 rounded-md">{voiceError}</p>}
                            
                            {!isLoadingVoices && !voiceError && (favoriteList.length + otherList.length) === 0 && ttsProvider === 'elevenlabs' && (
                               <p className="text-gray-400 text-sm p-3 bg-gray-900 rounded-md">No voices found.</p> 
                            )}

                            {favoriteList.length > 0 && (
                                <>
                                    <h4 className="text-xs font-bold text-gray-400 uppercase pt-2 tracking-wider">Favorites</h4>
                                    {favoriteList.map(renderVoiceItem)}
                                </>
                            )}
                            
                            {otherList.length > 0 && favoriteList.length > 0 && (
                                <div className="pt-2">
                                    <hr className="border-gray-700" />
                                </div>
                            )}

                            {otherList.length > 0 && (
                                <>
                                    {favoriteList.length > 0 && <h4 className="text-xs font-bold text-gray-400 uppercase pt-2 tracking-wider">All Voices</h4>}
                                    {otherList.map(renderVoiceItem)}
                                </>
                            )}
                        </div>
                         <button
                            onClick={onRegenerate}
                            disabled={isDisabled || !hasExtractedText || isLoadingVoices || (ttsProvider === 'elevenlabs' && !selectedVoice)}
                            className="w-full mt-4 p-3 rounded-md font-semibold text-white bg-cyan-600 hover:bg-cyan-500 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                            aria-label="Apply selected voice and regenerate audio"
                        >
                            Apply Voice & Regenerate Audio
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default VoicePanel;