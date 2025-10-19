import React, { useState, useCallback, useEffect, useRef } from 'react';
import FileUpload from './components/FileUpload';
import TextPreview from './components/TextPreview';
import AudioPlayer from './components/AudioPlayer';
import CoachingPanel from './components/CoachingPanel.tsx';
import { extractTextFromPdf } from './services/pdfService';
import { generateSpeech as generateGeminiSpeech, extractTextFromImage, sanitizeTextForSpeech, getAiClient } from './services/geminiService';
import { generateElevenLabsSpeech, verifyElevenLabsApiKey } from './services/elevenLabsService';
import { extractTextWithMathpix } from './services/mathpixService';
import { chunkText } from './utils/textUtils';
import { Status, TtsProvider, ChatMessage } from './types';
import StatusIndicator from './components/StatusIndicator';
import VoicePanel from './components/VoicePanel';
import ApiKeyPanel from './components/ApiKeyPanel';
import type { Chat } from '@google/genai';


const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [status, setStatus] = useState<Status>(Status.IDLE);
  const [statusMessage, setStatusMessage] = useState<string>('Upload a supported file to begin.');
  const [audioQueue, setAudioQueue] = useState<AudioBuffer[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [isVoicePanelOpen, setIsVoicePanelOpen] = useState(false);
  const [isApiPanelOpen, setIsApiPanelOpen] = useState(false);
  const [ttsProvider, setTtsProvider] = useState<TtsProvider>('gemini');
  const [selectedVoice, setSelectedVoice] = useState<string>('Kore');
  const [favoriteVoices, setFavoriteVoices] = useState<string[]>([]);

  // API Key State
  const [geminiApiKey, setGeminiApiKey] = useState<string>('');
  const [elevenLabsApiKey, setElevenLabsApiKey] = useState<string>('');
  const [mathpixAppId, setMathpixAppId] = useState<string>('');
  const [mathpixAppKey, setMathpixAppKey] = useState<string>('');

  const [elevenLabsKeyStatus, setElevenLabsKeyStatus] = useState<'unverified' | 'verifying' | 'valid' | 'invalid'>('unverified');

  // Coaching State
  const [coachingMessages, setCoachingMessages] = useState<ChatMessage[]>([]);
  const [isCoachResponding, setIsCoachResponding] = useState<boolean>(false);
  const chatSessionRef = useRef<Chat | null>(null);

  const sanitizeSecretApiKey = (key: string | null): string => {
    if (!key) return '';
    // Handle cases where user pastes "API_KEY = '...'"
    const parts = key.split('=');
    let potentialKey = parts[parts.length - 1].trim();
    if ((potentialKey.startsWith('"') && potentialKey.endsWith('"')) || (potentialKey.startsWith("'") && potentialKey.endsWith("'"))) {
        potentialKey = potentialKey.substring(1, potentialKey.length - 1).trim();
    }
    return potentialKey;
  };

  // Create wrapped setters to sanitize input
  const handleSetGeminiApiKey = (key: string) => setGeminiApiKey(sanitizeSecretApiKey(key));
  const handleSetElevenLabsApiKey = (key: string) => setElevenLabsApiKey(sanitizeSecretApiKey(key));
  const handleSetMathpixAppKey = (key: string) => setMathpixAppKey(sanitizeSecretApiKey(key));

  // Load keys and favorites from localStorage on initial render
  useEffect(() => {
    setGeminiApiKey(sanitizeSecretApiKey(localStorage.getItem('geminiApiKey')));
    setElevenLabsApiKey(sanitizeSecretApiKey(localStorage.getItem('elevenLabsApiKey')));
    setMathpixAppId(localStorage.getItem('mathpixAppId') || ''); // App ID is not a secret, no sanitization
    setMathpixAppKey(sanitizeSecretApiKey(localStorage.getItem('mathpixAppKey')));


    const savedFavorites = localStorage.getItem('favoriteVoices');
    if (savedFavorites) {
      try {
        setFavoriteVoices(JSON.parse(savedFavorites));
      } catch (e) {
        console.error("Failed to parse favorite voices from localStorage", e);
      }
    }
  }, []);

  // Save keys and favorites to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('geminiApiKey', geminiApiKey);
  }, [geminiApiKey]);
  useEffect(() => {
    localStorage.setItem('elevenLabsApiKey', elevenLabsApiKey);
  }, [elevenLabsApiKey]);
  useEffect(() => {
    localStorage.setItem('mathpixAppId', mathpixAppId);
  }, [mathpixAppId]);
  useEffect(() => {
    localStorage.setItem('mathpixAppKey', mathpixAppKey);
  }, [mathpixAppKey]);
  useEffect(() => {
    localStorage.setItem('favoriteVoices', JSON.stringify(favoriteVoices));
  }, [favoriteVoices]);

  // Effect to verify ElevenLabs key whenever it changes (with debounce)
  useEffect(() => {
      const verifyKey = async () => {
          if (!elevenLabsApiKey) {
              setElevenLabsKeyStatus('unverified');
              return;
          }
          setElevenLabsKeyStatus('verifying');
          try {
              const isValid = await verifyElevenLabsApiKey(elevenLabsApiKey);
              setElevenLabsKeyStatus(isValid ? 'valid' : 'invalid');
          } catch (error) {
              console.error("ElevenLabs key verification failed:", error);
              setElevenLabsKeyStatus('invalid');
          }
      };

      // Debounce the verification call
      const handler = setTimeout(() => {
          verifyKey();
      }, 500); // Wait 500ms after user stops typing

      return () => {
          clearTimeout(handler);
      };
  }, [elevenLabsApiKey]);


  const handleToggleFavoriteVoice = (voiceId: string) => {
    setFavoriteVoices(prevFavorites => {
      if (prevFavorites.includes(voiceId)) {
        return prevFavorites.filter(id => id !== voiceId);
      } else {
        return [...prevFavorites, voiceId];
      }
    });
  };

  const resetState = useCallback(() => {
    setFile(null);
    setExtractedText('');
    setStatus(Status.IDLE);
    setStatusMessage('Upload a supported file to begin.');
    setAudioQueue([]);
    setError(null);
    setCoachingMessages([]);
    setIsCoachResponding(false);
    chatSessionRef.current = null;
  }, []);

  const handleGenerateAudio = useCallback(async (textToProcess?: string) => {
    const currentText = textToProcess || extractedText;
    if (!currentText) {
      setError("No text available to generate audio from.");
      setStatus(Status.ERROR);
      setStatusMessage("Could not generate audio because no text was found.");
      return;
    }

    setStatus(Status.GENERATING_AUDIO);
    setAudioQueue([]);
    setError(null);

    try {
      const generateSpeechForChunk = async (chunk: string): Promise<AudioBuffer | null> => {
        if (ttsProvider === 'gemini') {
          return generateGeminiSpeech(geminiApiKey, chunk, selectedVoice);
        } else {
          if (!selectedVoice) {
            throw new Error("Please select an ElevenLabs voice in the sidebar.");
          }
          return generateElevenLabsSpeech(elevenLabsApiKey, chunk, selectedVoice);
        }
      };

      setStatusMessage('Splitting text into chunks for audio generation...');
      const textChunks = chunkText(currentText);
      const totalChunks = textChunks.length;

      if (totalChunks === 0) {
        throw new Error("The extracted text was empty after processing.");
      }
      
      setStatusMessage(`Generating audio for ${totalChunks} chunks... (This may take a moment)`);

      const audioBuffers: AudioBuffer[] = [];
      
      for (let i = 0; i < totalChunks; i++) {
        setStatusMessage(`Generating audio... (${i + 1}/${totalChunks})`);
        const audioData = await generateSpeechForChunk(textChunks[i]);
        if (audioData) {
          audioBuffers.push(audioData);
        }
      }

      if (audioBuffers.length === 0) {
        throw new Error("Audio generation failed for all text chunks.");
      }
      
      setAudioQueue(audioBuffers);
      setStatus(Status.SUCCESS);
      setStatusMessage('Audio generated successfully. Press play to listen.');

      // --- Initialize Coaching Session ---
      const systemInstruction = `You are an expert coach. Your goal is to help the user understand a document they've just processed. The full text of the document is provided below for your reference. First, the user will provide a summary. You must evaluate their summary against the document text, provide constructive feedback, and then ask one insightful follow-up question to probe their understanding further. For all subsequent turns, continue this pattern: evaluate their answer, provide feedback, and ask another relevant question. Keep your responses concise and encouraging.\n\n--- DOCUMENT TEXT ---\n${currentText}`;
      const aiClient = getAiClient(geminiApiKey);
      chatSessionRef.current = aiClient.chats.create({
          model: 'gemini-2.5-flash',
          config: { systemInstruction },
      });
      setCoachingMessages([{
          role: 'model',
          text: "The audio is ready! To help you retain what you've learned, please start by summarizing the key points of the document below."
      }]);
      // ------------------------------------

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred during audio generation.';
      console.error(errorMessage);
      setError(errorMessage);
      setStatus(Status.ERROR);
      setStatusMessage('An error occurred.');
    }
  }, [extractedText, ttsProvider, selectedVoice, geminiApiKey, elevenLabsApiKey]);

  const handleFileChange = async (selectedFile: File) => {
    if (!selectedFile) return;
    if (!geminiApiKey) {
        setError("A Google Gemini API key is required to process files. Please add it in the settings panel (cog icon).");
        setStatus(Status.ERROR);
        setStatusMessage("API Key Required.");
        setIsApiPanelOpen(true);
        return;
    }

    resetState();
    setFile(selectedFile);
    setStatus(Status.EXTRACTING_TEXT);
    setError(null);

    const mathpixExtensions = ['.epub', '.docx', '.pptx', '.azw', '.azw3', '.kfx', '.mobi', '.djvu', '.doc', '.wpd', '.odt'];
    const fileExt = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();

    try {
      let text = '';
      if (selectedFile.type.startsWith('image/')) {
        setStatusMessage(`Extracting text from image: ${selectedFile.name}...`);
        text = await extractTextFromImage(geminiApiKey, selectedFile);
      } else if (selectedFile.type === 'application/pdf') {
         try {
            // Attempt to use Mathpix for PDF first for better results if available
            text = await extractTextWithMathpix(mathpixAppId, mathpixAppKey, selectedFile, setStatusMessage);
         } catch (e) {
            console.warn("Mathpix processing for PDF failed, falling back to standard extraction:", e);
            setStatusMessage(`Extracting text from PDF (Standard)...`);
            text = await extractTextFromPdf(selectedFile);
         }
      } else if (mathpixExtensions.includes(fileExt)) {
        text = await extractTextWithMathpix(mathpixAppId, mathpixAppKey, selectedFile, setStatusMessage);
      } else {
        throw new Error("Unsupported file type. Please upload a supported document or image.");
      }
      
      if (!text.trim()) {
        throw new Error("No text could be extracted from the file.");
      }

      setStatusMessage('Making text readable for audio...');
      const sanitizedText = await sanitizeTextForSpeech(geminiApiKey, text);
      setExtractedText(sanitizedText);

      // Automatically generate the initial audio
      await handleGenerateAudio(sanitizedText);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      console.error(errorMessage);
      setError(errorMessage);
      setStatus(Status.ERROR);
      setStatusMessage('An error occurred.');
    }
  };

  const handleSendCoachingMessage = async (message: string) => {
      if (!chatSessionRef.current || isCoachResponding) return;

      const newUserMessage: ChatMessage = { role: 'user', text: message };
      setCoachingMessages(prev => [...prev, newUserMessage]);
      setIsCoachResponding(true);

      try {
          const response = await chatSessionRef.current.sendMessage({ message });
          const modelResponse: ChatMessage = { role: 'model', text: response.text };
          setCoachingMessages(prev => [...prev, modelResponse]);
      } catch (err) {
          console.error("Coaching API error:", err);
          const errorMessage = err instanceof Error ? err.message : "Sorry, I encountered an error.";
          const errorResponse: ChatMessage = { role: 'model', text: `Error: ${errorMessage}` };
          setCoachingMessages(prev => [...prev, errorResponse]);
      } finally {
          setIsCoachResponding(false);
      }
  };


  const isProcessing = status === Status.EXTRACTING_TEXT || status === Status.GENERATING_AUDIO;

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 flex relative">
      <VoicePanel
        isOpen={isVoicePanelOpen}
        onClose={() => setIsVoicePanelOpen(false)}
        ttsProvider={ttsProvider}
        setTtsProvider={setTtsProvider}
        selectedVoice={selectedVoice}
        setSelectedVoice={setSelectedVoice}
        isDisabled={isProcessing}
        onRegenerate={() => handleGenerateAudio()}
        hasExtractedText={!!extractedText}
        favoriteVoices={favoriteVoices}
        onToggleFavorite={handleToggleFavoriteVoice}
        geminiApiKey={geminiApiKey}
        elevenLabsApiKey={elevenLabsApiKey}
        elevenLabsKeyStatus={elevenLabsKeyStatus}
      />

      <ApiKeyPanel
          isOpen={isApiPanelOpen}
          onClose={() => setIsApiPanelOpen(false)}
          geminiApiKey={geminiApiKey}
          setGeminiApiKey={handleSetGeminiApiKey}
          elevenLabsApiKey={elevenLabsApiKey}
          setElevenLabsApiKey={handleSetElevenLabsApiKey}
          mathpixAppId={mathpixAppId}
          setMathpixAppId={setMathpixAppId}
          mathpixAppKey={mathpixAppKey}
          setMathpixAppKey={handleSetMathpixAppKey}
          isDisabled={isProcessing}
          elevenLabsKeyStatus={elevenLabsKeyStatus}
      />

      <div className="fixed top-4 left-4 z-40">
           <button 
              onClick={() => setIsVoicePanelOpen(true)} 
              className={`p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition-opacity duration-300 ${isVoicePanelOpen || isApiPanelOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
              aria-label="Open voice settings"
           >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
           </button>
      </div>

       <div className="fixed top-4 right-4 z-40">
           <button 
              onClick={() => setIsApiPanelOpen(true)} 
              className={`p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition-opacity duration-300 ${isApiPanelOpen || isVoicePanelOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
              aria-label="Open API key settings"
           >
              <svg xmlns="http://www.w.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
           </button>
        </div>
      
      <div className="flex-1 flex flex-col items-center p-4 sm:p-6 md:p-8">
        <div className="w-full max-w-4xl mx-auto">
          <header className="text-center mb-8">
            <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">
              Walk-n-Sync
            </h1>
            <p className="mt-2 text-lg text-gray-400">
              Listen to your documents and sharpen your knowledge with an AI learning coach.
            </p>
          </header>

          <main className="bg-gray-800 shadow-2xl rounded-lg p-6 space-y-6">
            {error && (
              <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-md" role="alert">
                <strong className="font-bold">Error: </strong>
                <span className="block sm:inline">{error}</span>
              </div>
            )}

            <FileUpload onFileSelect={handleFileChange} disabled={isProcessing} />

            <StatusIndicator status={status} message={statusMessage} />

            {extractedText && (
              <TextPreview text={extractedText} />
            )}

            {audioQueue.length > 0 && (
              <AudioPlayer audioQueue={audioQueue} onReset={resetState} />
            )}

            {coachingMessages.length > 0 && (
              <CoachingPanel
                messages={coachingMessages}
                onSendMessage={handleSendCoachingMessage}
                isResponding={isCoachResponding}
              />
            )}
          </main>

          <footer className="text-center mt-8 text-gray-500 text-sm">
            <p>Powered by React, Tailwind CSS, and various AI APIs</p>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default App;