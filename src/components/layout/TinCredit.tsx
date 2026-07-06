import React from 'react';

export default function TinCredit() {
  return (
    <a
      href="https://tin.computer"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-500"
    >
      <span
        aria-hidden="true"
        className="inline-block h-[1em] w-[1em] bg-[#66DC9D]"
      />
      <span>Growth by Tin</span>
    </a>
  );
}
