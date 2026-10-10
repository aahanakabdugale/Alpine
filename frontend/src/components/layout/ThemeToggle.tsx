import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

export function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <motion.button
      type="button"
      onClick={toggleTheme}
      whileHover={{ scale: 1.06, y: -1 }}
      whileTap={{ scale: 0.92, y: 1 }}
      title={isDark ? 'Switch to Mint Fresh Light Mode' : 'Switch to Matte Nocturnal Dark Mode'}
      aria-label="Toggle visual theme"
      className="relative flex items-center justify-center w-10 h-10 rounded-2xl transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary bg-surface border border-border shadow-clay-pill dark:shadow-clay-dark-pill cursor-pointer"
    >
      <AnimatePresence mode="wait" initial={false}>
        {isDark ? (
          <motion.div
            key="moon"
            initial={{ rotate: -70, scale: 0.4, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: 70, scale: 0.4, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 22 }}
            className="flex items-center justify-center text-primary"
          >
            <Moon className="w-4 h-4 stroke-[2.2]" />
          </motion.div>
        ) : (
          <motion.div
            key="sun"
            initial={{ rotate: 70, scale: 0.4, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: -70, scale: 0.4, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 22 }}
            className="flex items-center justify-center text-amber-500"
          >
            <Sun className="w-4 h-4 stroke-[2.2]" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
