import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Moon, Sun, Monitor } from 'lucide-react';
import { motion } from 'motion/react';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const options = [
    { id: 'light', icon: Sun, label: 'Light' },
    { id: 'system', icon: Monitor, label: 'System' },
    { id: 'dark', icon: Moon, label: 'Dark' },
  ];

  return (
    <div className="flex items-center bg-gray-100 dark:bg-[#2C2C2E] p-1 rounded-full border border-gray-200/50 dark:border-white/5 relative">
      {options.map((option) => {
        const isActive = theme === option.id;
        return (
          <button
            key={option.id}
            onClick={() => setTheme(option.id as any)}
            className={`relative z-10 p-2 rounded-full transition-colors duration-200 ${
              isActive 
                ? 'text-gray-900 dark:text-white' 
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
            title={option.label}
          >
            {isActive && (
              <motion.div
                layoutId="theme-active"
                className="absolute inset-0 bg-white dark:bg-[#636366] rounded-full shadow-sm z-[-1]"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
            <option.icon className="w-4 h-4" />
          </button>
        );
      })}
    </div>
  );
}
