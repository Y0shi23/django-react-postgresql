import React, { useEffect, useRef } from 'react';
// @ts-ignore
import hljs from 'highlight.js';
import 'highlight.js/styles/vs2015.css';

interface CodeBlockProps {
  code: string;
  language: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ code, language }) => {
  const codeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (codeRef.current) {
      hljs.highlightElement(codeRef.current);
    }
  }, [code, language]);

  return (
    <div className="rounded-md overflow-hidden my-4">
      <div className="bg-gray-800 text-gray-200 px-4 py-2 text-sm flex justify-between items-center">
        <span>{language}</span>
        <button 
          onClick={() => navigator.clipboard.writeText(code)}
          className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded transition-colors"
        >
          コピー
        </button>
      </div>
      <div className="hljs-wrapper">
        <pre>
          <code ref={codeRef} className={`language-${language}`}>
            {code}
          </code>
        </pre>
      </div>
    </div>
  );
};

export default CodeBlock; 