import React from 'react';

export default function AnnouncementsBox() {
  return (
    <div className="bg-white p-8 rounded-lg shadow-md max-w-xs w-full">
      <h2 className="text-xl font-bold text-black mb-4">📢 Now in open beta!</h2>
      <p className="text-gray-600 text-sm">
        We are very excited to let everyone try cheat-code.cc for completely free! <br /><br />
        Let us know what you think at{" "}
        <a
          href="mailto:hi@cheat-code.cc"
          className="text-blue-600 underline hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
        >
          hi@cheat-code.cc
        </a>
      </p>
    </div>
  );
}
