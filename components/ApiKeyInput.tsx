import React, { useState } from 'react';

interface ApiKeyInputProps {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    disabled: boolean;
    isPassword?: boolean;
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


const ApiKeyInput: React.FC<ApiKeyInputProps> = ({
    id,
    label,
    value,
    onChange,
    placeholder,
    disabled,
    isPassword = true,
}) => {
    const [isVisible, setIsVisible] = useState(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value;
        // Handle cases where user pastes "API_KEY = '...'"
        const parts = val.split('=');
        let potentialKey = parts[parts.length - 1].trim();
        if ((potentialKey.startsWith('"') && potentialKey.endsWith('"')) || (potentialKey.startsWith("'") && potentialKey.endsWith("'"))) {
            potentialKey = potentialKey.substring(1, potentialKey.length - 1);
        }
        onChange(potentialKey);
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
                    className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 focus:ring-cyan-500 focus:border-cyan-500 text-sm pr-10"
                />
                {isPassword && (
                    <button
                        type="button"
                        onClick={() => setIsVisible(!isVisible)}
                        className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-200"
                        aria-label={isVisible ? 'Hide key' : 'Show key'}
                    >
                       <EyeIcon isSlashed={!isVisible} />
                    </button>
                )}
            </div>
        </div>
    );
};

export default ApiKeyInput;