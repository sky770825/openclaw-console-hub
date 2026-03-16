/**
 * MotionPanel — Framer Motion 動畫面板包裝器
 *
 * 為任何子元素加入進場動畫（淡入 + 上滑 + 縮放）。
 * 支援 stagger 延遲，用於 grid 佈局。
 */
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Props {
  children: React.ReactNode;
  /** stagger 索引，用於計算延遲 */
  index?: number;
  /** 延遲基數（秒），預設 0.08 */
  staggerDelay?: number;
  /** 額外的 className */
  className?: string;
  /** 是否使用全息卡片樣式 */
  holo?: boolean;
  /** 滑鼠懸停時的縮放效果 */
  hover?: boolean;
}

const panelVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.08,
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  }),
};

export default function MotionPanel({
  children,
  index = 0,
  staggerDelay = 0.08,
  className,
  holo = false,
  hover = true,
}: Props) {
  return (
    <motion.div
      custom={index}
      variants={{
        ...panelVariants,
        visible: (i: number) => ({
          opacity: 1,
          y: 0,
          scale: 1,
          transition: {
            delay: i * staggerDelay,
            duration: 0.5,
            ease: [0.25, 0.46, 0.45, 0.94],
          },
        }),
      }}
      initial="hidden"
      animate="visible"
      whileHover={hover ? { scale: 1.02, transition: { duration: 0.2 } } : undefined}
      className={cn(holo && "sc-holo-card", className)}
    >
      {children}
    </motion.div>
  );
}

/**
 * MotionList — 帶 stagger 的列表容器
 */
export function MotionList({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.08 } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
