import React from 'react';
import Link from 'next/link';

export default function AnnouncementsBox() {
  return (
    <div className="bg-white p-8 rounded-lg shadow-md max-w-xs w-full">
      <h2 className="text-xl font-bold text-black mb-4 text-center">📢 Now in open beta!</h2>
      <p className="text-gray-600 text-sm">
        We are very excited to let everyone try cheat-code.cc for completely free! <br /><br />
        Learn more {" "}
        <Link href="/about" className="text-blue-600 hover:underline font-bold">about</Link>
        {" "} cheat-code here.
      </p>
    </div>
  );
}
