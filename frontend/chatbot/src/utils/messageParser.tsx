import React from 'react';
import CodeBlock from '@/components/CodeBlock';

// コードブロックを検出する正規表現
const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;

/**
 * メッセージ内のコードブロックを検出し、適切なコンポーネントに変換する
 * @param text メッセージテキスト
 * @returns JSX要素の配列
 */
export const parseMessageContent = (text: string): React.ReactNode[] => {
  if (!text) return [<p key="empty"></p>];

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  // コードブロックを検出して処理
  while ((match = codeBlockRegex.exec(text)) !== null) {
    // コードブロックの前のテキストを追加
    if (match.index > lastIndex) {
      parts.push(
        <p key={`text-${lastIndex}`} className="whitespace-pre-wrap">
          {text.substring(lastIndex, match.index)}
        </p>
      );
    }

    // コードブロックを追加
    const language = match[1] || 'plaintext';
    const code = match[2];
    parts.push(
      <CodeBlock 
        key={`code-${match.index}`} 
        language={language} 
        code={code} 
      />
    );

    lastIndex = match.index + match[0].length;
  }

  // 残りのテキストを追加
  if (lastIndex < text.length) {
    parts.push(
      <p key={`text-${lastIndex}`} className="whitespace-pre-wrap">
        {text.substring(lastIndex)}
      </p>
    );
  }

  return parts;
}; 