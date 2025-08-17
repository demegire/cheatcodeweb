import React from "react";

/**
 * Convert URLs in text to clickable links and highlight @mentions.
 * - Matches only http/https URLs for security
 * - Mentions appear in blue
 */
export function linkifyText(text: string): React.ReactNode {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const mentionRegex = /(@[\w]+)/g;

  return text.split(urlRegex).map((part, index) => {
    // If it's a URL → make it a link
    if (/^https?:\/\/\S+$/.test(part)) {
      return (
        <a
          key={`url-${index}`}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline"
        >
          {part}
        </a>
      );
    }

    // Otherwise → split further to highlight mentions
    const pieces = part.split(mentionRegex);
    return (
      <React.Fragment key={`seg-${index}`}>
        {pieces.map((p, i) =>
          /^@[\w]+$/.test(p) ? (
            <span key={`m-${index}-${i}`} className="text-blue-600">
              {p}
            </span>
          ) : (
            <React.Fragment key={`t-${index}-${i}`}>{p}</React.Fragment>
          )
        )}
      </React.Fragment>
    );
  });
}
