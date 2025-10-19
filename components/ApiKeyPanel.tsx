import React from 'react';
import ApiKeyInput from './ApiKeyInput';

interface ApiKeyPanelProps {
    isOpen: boolean;
    onClose: () => void;
    geminiApiKey: string;
    setGeminiApiKey: (key: string) => void;
    elevenLabsApiKey: string;
    setElevenLabsApiKey: (key: string) => void;
    mathpixAppId: string;
    setMathpixAppId: (id: string) => void;
    mathpixAppKey: string;
    setMathpixAppKey: (key: string) => void;
    isDisabled: boolean;
    elevenLabsKeyStatus: 'unverified' | 'verifying' | 'valid' | 'invalid';
}

const ApiKeyPanel: React.FC<ApiKeyPanelProps> = ({
    isOpen,
    onClose,
    geminiApiKey,
    setGeminiApiKey,
    elevenLabsApiKey,
    setElevenLabsApiKey,
    mathpixAppId,
    setMathpixAppId,
    mathpixAppKey,
    setMathpixAppKey,
    isDisabled,
    elevenLabsKeyStatus,
}) => {
    return (
        <>
            <div className={`fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={onClose}></div>
            <aside className={`fixed inset-y-0 right-0 z-50 w-80 bg-gray-800 text-white transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'} shadow-2xl flex flex-col`}>
                <div className="flex items-center justify-between p-4 border-b border-gray-700">
                    <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">API Keys</h2>
                    <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-gray-700">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="flex-1 p-4 overflow-y-auto space-y-6">
                    <div className="bg-gray-900 rounded-md p-3 space-y-4">
                        <ApiKeyInput
                            id="gemini-api-key"
                            label="Google Gemini"
                            value={geminiApiKey}
                            onChange={setGeminiApiKey}
                            disabled={isDisabled}
                            placeholder="Enter your Gemini API key"
                        />
                        <ApiKeyInput
                            id="elevenlabs-api-key"
                            label="ElevenLabs (for TTS)"
                            value={elevenLabsApiKey}
                            onChange={setElevenLabsApiKey}
                            disabled={isDisabled}
                            placeholder="Enter your ElevenLabs API key"
                            verificationStatus={elevenLabsKeyStatus}
                        />
                        <ApiKeyInput
                            id="mathpix-app-id"
                            label="Mathpix App ID (for Documents)"
                            value={mathpixAppId}
                            onChange={setMathpixAppId}
                            disabled={isDisabled}
                            placeholder="Enter your Mathpix App ID"
                            isPassword={false} // App ID is not a secret
                        />
                        <ApiKeyInput
                            id="mathpix-app-key"
                            label="Mathpix App Key (for Documents)"
                            value={mathpixAppKey}
                            onChange={setMathpixAppKey}
                            disabled={isDisabled}
                            placeholder="Enter your Mathpix App Key"
                        />
                        <p className="text-xs text-gray-500">Your keys are saved securely in your browser for future visits.</p>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default ApiKeyPanel;