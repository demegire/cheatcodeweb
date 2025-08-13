import React from 'react';

export default function ContactBox() {
  return (
    <div className="bg-white p-4 rounded-lg shadow-md max-w-xs w-full text-center">
      <h2 className="text-xl font-bold text-black mb-2">☎️ Contact</h2>
      <div className='flex item-center justify-center'>
      <p>
      📧
      </p>
      <a
        href="mailto:ege@cheat-code.cc"
        className="text-blue-600 underline hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
      >
        ege@cheat-code.cc
      </a>
      </div>
    </div>
  );
}
