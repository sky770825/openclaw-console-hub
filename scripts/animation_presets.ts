/**
 * Linear & Vercel Style Animation Presets
 * Generated for "阿工" based on research results.
 */

export const transitions = {
  defaultSpring: {
    type: "spring",
    stiffness: 300,
    damping: 30,
    mass: 1
  },
  snappy: {
    type: "spring",
    stiffness: 500,
    damping: 40,
    mass: 0.8
  }
};

export const variants = {
  fadeInUp: {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
    transition: transitions.defaultSpring
  },
  hoverScale: {
    whileHover: { scale: 1.02 },
    whileTap: { scale: 0.98 },
    transition: transitions.snappy
  },
  pageTransition: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.3, ease: "easeInOut" }
  }
};
