import React, { useState } from 'react';

interface ApiKeyInputProps {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    disabled: boolean;
    isPassword?: boolean;
    verificationStatus?: 'unverified' | 'verifying' | 'valid' | 'invalid';
}

const EyeIcon = ({ isSlashed }: { isSlashed: boolean }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        {isSlashed ? (
            <>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
            </>
        ) : (
            <>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </>
        )}
    </svg>
);

const VerificationStatusIcon: React.FC<{ status: ApiKeyInputProps['verificationStatus'] }> = ({ status }) => {
    switch (status) {
        case 'verifying':
            return (
                <div className="h-5 w-5 text-gray-400" aria-label="Verifying key">
                    <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </div>
            );
        case 'valid':
            return (
                <div className="h-5 w-5 text-green-400" aria-label="API key is valid">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
                    </svg>
                </div>
            );
        case 'invalid':
            return (
                <div className="h-5 w-5 text-red-400" aria-label="API key is invalid">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293 5.354 4.646z"/>
                    </svg>
                </div>
            );
        default:
            return null;
    }
};

const ApiKeyInput: React.FC<ApiKeyInputProps> = ({
    id,
    label,
    value,
    onChange,
    placeholder,
    disabled,
    isPassword = true,
    verificationStatus
}) => {
    const [isVisible, setIsVisible] = useState(false);

    // Sanitization logic is now handled in App.tsx, so we just pass the raw value up.
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(e.target.value);
    };

    return (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-gray-400 mb-1">
                {label}
            </label>
            <div className="relative">
                <input
                    type={isPassword && !isVisible ? 'password' : 'text'}
                    id={id}
                    value={value}
                    onChange={handleInputChange}
                    disabled={disabled}
                    placeholder={placeholder}
                    className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 focus:ring-cyan-500 focus:border-cyan-500 text-sm pr-14"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <div className="flex items-center space-x-2">
                        {verificationStatus && verificationStatus !== 'unverified' && <VerificationStatusIcon status={verificationStatus} />}
                        {isPassword && (
                            <button
                                type="button"
                                onClick={() => setIsVisible(!isVisible)}
                                className="text-gray-400 hover:text-gray-200"
                                aria-label={isVisible ? 'Hide key' : 'Show key'}
                            >
                               <EyeIcon isSlashed={!isVisible} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ApiKeyInput;