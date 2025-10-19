import React, { useState } from 'react';

interface TextPreviewProps {
  text: string;
}

const TextPreview: React.FC<TextPreviewProps> = ({ text }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isTruncated = text.length > 1000;

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-semibold text-cyan-400">Extracted Text</h2>
        {isTruncated && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
            aria-expanded={isExpanded}
          >
            {isExpanded ? 'Show Less' : 'Show More'}
          </button>
        )}
      </div>
      <div className={`bg-gray-900 rounded-md p-4 overflow-y-auto border border-gray-700 transition-all duration-300 ease-in-out ${isExpanded ? 'h-80' : 'h-40'}`}>
        <p className="text-gray-300 whitespace-pre-wrap text-sm">
          {isTruncated && !isExpanded ? `${text.substring(0, 1000)}...` : text}
        </p>
      </div>
    </div>
  );
};

export default TextPreview;