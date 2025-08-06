import React, { useState } from 'react';
import Image from 'next/image';

interface Slide {
  image: string;
  text: string;
}

interface TutorialModalProps {
  slides: Slide[];
  onFinish: () => void;
}

export default function TutorialModal({ slides, onFinish }: TutorialModalProps) {
  const [index, setIndex] = useState(0);

  const handleNext = () => {
    if (index === slides.length - 1) {
      onFinish();
    } else {
      setIndex(index + 1);
    }
  };

  const handlePrev = () => {
    if (index > 0) {
      setIndex(index - 1);
    }
  };

  const current = slides[index];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-full h-48 mb-4 relative">
          <Image
            src={current.image}
            alt="Tutorial step"
            fill
            className="object-contain"
          />
        </div>
        <div className="flex justify-center mb-4">
          {slides.map((_, i) => (
            <span
              key={i}
              className={`h-2 w-2 rounded-full mx-1 ${
                i === index ? 'bg-blue-500' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
        <p className="text-sm text-gray-700 mb-6">{current.text}</p>
        <div className="flex justify-between">
          <button
            onClick={handlePrev}
            disabled={index === 0}
            className="px-4 py-2 text-sm rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 disabled:opacity-50"
          >
            Prev
          </button>
          <button
            onClick={handleNext}
            className="px-4 py-2 text-sm rounded-full bg-theme hover:bg-theme-hover text-white"
          >
            {index === slides.length - 1 ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}

