/**
 * Linear/Vercel Style Animation Patterns (React + Framer Motion)
 */

import { motion } from 'framer-motion';

// 1. Spring Physics Configuration (The "Linear" Look)
export const springConfig = {
  type: "spring",
  stiffness: 260,
  damping: 20
};

// 2. Spotlight Card Component Logic
// Apply to a div with background: radial-gradient(circle at var(--x) var(--y), ...)
export const handleMouseMove = (e) => {
  const { currentTarget, clientX, clientY } = e;
  const { left, top } = currentTarget.getBoundingClientRect();
  currentTarget.style.setProperty("--x", `${clientX - left}px`);
  currentTarget.style.setProperty("--y", `${clientY - top}px`);
};

// 3. Layout Animation Snippet
export const ListTransition = ({ items }) => (
  <ul>
    {items.map(item => (
      <motion.li
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={springConfig}
        key={item.id}
      >
        {item.content}
      </motion.li>
    ))}
  </ul>
);

// 4. Command Menu Animation
export const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: { duration: 0.2, ease: "easeOut" }
  },
  exit: { 
    opacity: 0, 
    scale: 0.95, 
    transition: { duration: 0.15 }
  }
};
