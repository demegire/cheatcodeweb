'use client';

import { useEffect, useState } from 'react';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

const CELL_SIZE = 60; // pixels for each square

export default function TickCrossBackground() {
  const [rows, setRows] = useState(0);
  const [cols, setCols] = useState(0);
  const [states, setStates] = useState<boolean[]>([]);

  const initStates = (r: number, c: number) =>
    Array.from({ length: r * c }, (_, idx) => {
      const row = Math.floor(idx / c);
      const col = idx % c;
      return (row + col) % 2 === 0; // true => tick, false => cross
    });

  useEffect(() => {
    const updateGrid = () => {
      const c = Math.ceil(window.innerWidth / CELL_SIZE);
      const r = Math.ceil(window.innerHeight / CELL_SIZE);
      setRows(r);
      setCols(c);
      setStates(initStates(r, c));
    };

    updateGrid();
    window.addEventListener('resize', updateGrid);
    return () => window.removeEventListener('resize', updateGrid);
  }, []);

  const toggle = (index: number) => {
    setStates((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  };

  return (
    <div
      className="fixed z-0 grid"
      style={{
        left: `calc(50% - ${(cols * CELL_SIZE) / 2}px)`,
        top: `calc(50% - ${(rows * CELL_SIZE) / 2}px)`,
        width: `${cols * CELL_SIZE}px`,
        height: `${rows * CELL_SIZE}px`,
        gridTemplateColumns: `repeat(${cols}, ${CELL_SIZE}px)`,
        gridTemplateRows: `repeat(${rows}, ${CELL_SIZE}px)`,
      }}
    >
      {states.map((isTick, idx) => (
        <button
          key={idx}
          onClick={() => toggle(idx)}
          className="flex items-center justify-center"
        >
          <span className="w-8 h-8 rounded-full gray-50 flex items-center justify-center">
            {isTick ? (
              <CheckIcon className="w-5 h-5 text-green-600" />
            ) : (
              <XMarkIcon className="w-5 h-5 text-red-600" />
            )}
          </span>
        </button>
      ))}
    </div>
  );
}
