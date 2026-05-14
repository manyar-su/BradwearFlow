import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';

const MOTIVATIONS = [
  "Semangat! Setiap jahitan adalah karya seni 🎨",
  "Hari ini penuh berkah, kerja keras pasti berbuah manis 💪",
  "Tetap fokus, kesuksesan ada di depan mata ✨",
  "Kualitas terbaik dimulai dari niat yang baik 🌟",
  "Satu langkah kecil hari ini, lompatan besar besok 🚀",
  "Kerja keras tidak akan mengkhianati hasil 💎",
  "Jadilah yang terbaik dalam setiap jahitan 👔",
  "Kesabaran dan ketelitian adalah kunci kesempurnaan 🔑",
  "Hari yang produktif dimulai dengan semangat pagi ☀️",
  "Terus berinovasi, terus berkembang 📈"
];

interface DailyMotivationProps {
  isDarkMode: boolean;
}

const DailyMotivation: React.FC<DailyMotivationProps> = ({ isDarkMode }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Get daily motivation based on date
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
    const dailyIndex = dayOfYear % MOTIVATIONS.length;
    setCurrentIndex(dailyIndex);
  }, []);

  useEffect(() => {
    // Auto-hide after 10 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 10000);

    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  // Split text into words for animation
  const words = MOTIVATIONS[currentIndex].split(' ');

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: -50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: -50 }}
        transition={{ 
          duration: 0.6,
          type: "spring",
          stiffness: 200,
          damping: 20
        }}
        className={`fixed top-20 left-0 right-0 z-50 mx-4 ${isDarkMode ? 'bg-gradient-to-r from-emerald-600 to-teal-600' : 'bg-gradient-to-r from-emerald-500 to-teal-500'} rounded-3xl shadow-2xl overflow-hidden`}
      >
        <div className="relative p-6">
          {/* Close Button */}
          <motion.button
            onClick={() => setIsVisible(false)}
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-all z-10"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </motion.button>

          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-2 mb-3"
          >
            <motion.div
              animate={{
                rotate: [0, 15, -15, 0],
                scale: [1, 1.2, 1.2, 1]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <Sparkles size={20} className="text-yellow-300" />
            </motion.div>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/80">
              Daily Motivation
            </span>
          </motion.div>

          {/* Animated Text with Bouncing Words */}
          <div className="flex flex-wrap gap-1 pr-8 min-h-[60px] items-center">
            {words.map((word, index) => (
              <motion.span
                key={index}
                initial={{ opacity: 0, y: 20, scale: 0 }}
                animate={{ 
                  opacity: 1, 
                  y: 0,
                  scale: 1
                }}
                transition={{
                  delay: index * 0.1,
                  duration: 0.5,
                  type: "spring",
                  stiffness: 300,
                  damping: 15
                }}
                whileHover={{
                  scale: 1.2,
                  rotate: [0, -5, 5, 0],
                  transition: { duration: 0.3 }
                }}
                className="text-white font-bold text-base italic inline-block cursor-default"
              >
                {word}
              </motion.span>
            ))}
          </div>

          {/* Decorative Elements */}
          <motion.div
            className="absolute -left-10 -bottom-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          
          <motion.div
            className="absolute -right-10 -top-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"
            animate={{
              scale: [1.2, 1, 1.2],
              opacity: [0.5, 0.3, 0.5]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />

          {/* Progress Bar */}
          <motion.div
            className="absolute bottom-0 left-0 h-1 bg-yellow-300 rounded-full"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 10, ease: "linear" }}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default DailyMotivation;
