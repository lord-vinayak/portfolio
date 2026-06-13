'use client';

import { MoonIcon, SunIcon } from '@radix-ui/react-icons';
import { motion } from 'motion/react';
import { useRef, useState, useMemo } from 'react';
import { useTheme } from 'next-themes';

export function LampToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === 'dark';

  const chainPulled = useMemo(() => isDarkMode, [isDarkMode]);
  const chainLength = useMemo(() => (isDarkMode ? 240 : 210), [isDarkMode]);

  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef(0);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    startY.current = e.clientY;
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setDragY(Math.max(0, e.clientY - startY.current));
  };

  const handlePointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (dragY > 8) {
      setTheme(theme === 'dark' ? 'light' : 'dark');
    }
    setTimeout(() => setDragY(0), 100);
  };

  return (
    <div className='hidden md:flex fixed top-0 right-32 flex-col items-center z-50 pointer-events-none'>
      {/* ceiling mount */}
      <div className='w-5 h-2 bg-gray-300 dark:bg-gray-600 rounded-b-md' />

      {/* chain */}
      <motion.div
        className='w-1 bg-linear-to-b from-gray-400 to-gray-600 dark:from-gray-500 dark:to-gray-300 rounded-full relative'
        animate={{ height: chainLength + dragY }}
        transition={{
          duration: isDragging ? 0.05 : 0.6,
          ease: isDragging ? 'linear' : 'easeOut',
          type: isDragging ? 'tween' : 'spring',
          stiffness: isDragging ? undefined : 200,
          damping: isDragging ? undefined : 20,
        }}
        style={{ height: `${chainLength + dragY}px`, transformOrigin: 'top center' }}
      >
        {dragY > 4 &&
          Array.from({ length: Math.floor((chainLength + dragY) / 8) }).map((_, i) => (
            <div
              key={i}
              className='absolute w-full h-0.5 bg-gray-500 dark:bg-gray-400 rounded-full opacity-40'
              style={{ top: `${(i / Math.floor((chainLength + dragY) / 8)) * 100}%` }}
            />
          ))}
      </motion.div>

      {/* lamp ball */}
      <motion.div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        animate={{
          rotateZ: chainPulled ? 180 : 0,
          scale: isDragging ? 1.12 : 1,
          y: dragY,
        }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
        className='w-6 h-6 bg-linear-to-br from-yellow-400 to-yellow-600 dark:from-yellow-300 dark:to-yellow-500 rounded-full shadow-lg border-2 border-yellow-500 dark:border-yellow-400 cursor-grab active:cursor-grabbing relative overflow-hidden pointer-events-auto select-none'
        style={{ position: 'relative', top: -20 }}
        whileHover={{ scale: isDragging ? 1.12 : 1.08 }}
      >
        <div className='w-full h-full rounded-full bg-linear-to-br from-yellow-300 to-transparent opacity-60' />
        <div className='absolute inset-0 flex items-center justify-center'>
          {isDarkMode ? (
            <MoonIcon className='w-3 h-3 text-gray-800' />
          ) : (
            <SunIcon className='w-3 h-3 text-gray-800' />
          )}
        </div>

        {!isDragging && !chainPulled && (
          <motion.div
            className='absolute -bottom-10 left-1/2 -translate-x-1/2 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap pointer-events-none bg-white/80 dark:bg-neutral-800/80 px-2 py-1 rounded-full'
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 1, 0] }}
            transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
          >
            Pull to toggle
          </motion.div>
        )}

        {isDragging && dragY > 4 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: dragY > 8 ? 1 : 0.7, scale: dragY > 8 ? 1.1 : 1 }}
            className={`absolute -bottom-12 left-1/2 -translate-x-1/2 text-xs text-white px-3 py-1.5 rounded-full whitespace-nowrap pointer-events-none font-medium ${
              dragY > 8
                ? 'bg-neutral-800 dark:bg-neutral-200 dark:text-neutral-800'
                : 'bg-neutral-500'
            }`}
          >
            {dragY > 8
              ? `Release for ${isDarkMode ? 'light' : 'dark'} mode`
              : `Pull ${Math.round(8 - dragY)}px more`}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
