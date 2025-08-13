import React from 'react';

/**
 * Convert URLs in text to clickable links.
 * Only matches http and https schemes to avoid javascript injections.
 */
export function linkifyText(text: string): React.ReactNode {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.split(urlRegex).map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline"
        >
          {part}
        </a>
      );
    }
    return part;
  });
}
