import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage } from '../types';

interface CoachingPanelProps {
    messages: ChatMessage[];
    onSendMessage: (message: string) => void;
    isResponding: boolean;
}

const CoachingPanel: React.FC<CoachingPanelProps> = ({ messages, onSendMessage, isResponding }) => {
    const [inputText, setInputText] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isResponding]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputText.trim() && !isResponding) {
            onSendMessage(inputText.trim());
            setInputText('');
        }
    };

    return (
        <div className="bg-gray-700/50 p-4 rounded-lg space-y-4 mt-6">
            <h2 className="text-xl font-semibold text-cyan-400">Learning Coach</h2>

            <div className="h-80 bg-gray-900 rounded-md p-4 overflow-y-auto border border-gray-700 flex flex-col space-y-4">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                        {msg.role === 'model' && (
                           <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-sm font-bold">
                             AI
                           </div>
                        )}
                        <div className={`max-w-md rounded-lg px-4 py-2 ${msg.role === 'model' ? 'bg-gray-800 text-gray-300' : 'bg-cyan-600 text-white'}`}>
                            <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                        </div>
                         {msg.role === 'user' && (
                           <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-600 flex items-center justify-center text-sm font-bold">
                             You
                           </div>
                        )}
                    </div>
                ))}
                 {isResponding && (
                     <div className="flex items-start gap-3">
                         <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-sm font-bold">
                           AI
                         </div>
                         <div className="max-w-md rounded-lg px-4 py-3 bg-gray-800 text-gray-400 flex items-center space-x-2">
                             <span className="h-2 w-2 bg-cyan-400 rounded-full animate-pulse [animation-delay:-0.3s]"></span>
                             <span className="h-2 w-2 bg-cyan-400 rounded-full animate-pulse [animation-delay:-0.15s]"></span>
                             <span className="h-2 w-2 bg-cyan-400 rounded-full animate-pulse"></span>
                         </div>
                     </div>
                 )}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSubmit} className="flex items-center space-x-2">
                <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Type your summary or answer here..."
                    disabled={isResponding}
                    className="w-full bg-gray-600 border border-gray-500 rounded-md p-2 focus:ring-cyan-500 focus:border-cyan-500 text-sm disabled:bg-gray-800"
                    aria-label="Chat input"
                />
                <button
                    type="submit"
                    disabled={isResponding || !inputText.trim()}
                    className="p-2 rounded-md bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                    aria-label="Send message"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                </button>
            </form>
        </div>
    );
};

export default CoachingPanel;
