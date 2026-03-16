/**
 * WarpStarfield — tsParticles 曲速星場背景
 *
 * 全螢幕粒子星場，帶有曲速拉伸效果。
 * 用於 AppLayout 背景層，z-index: 0。
 */
import { useCallback, useMemo } from "react";
import Particles from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import type { Engine, ISourceOptions } from "@tsparticles/engine";

interface Props {
  /** 粒子數量，預設 120 */
  count?: number;
  /** 移動速度，預設 1.8 */
  speed?: number;
  /** 是否啟用曲速效果（拉伸尾跡），預設 true */
  warp?: boolean;
}

export default function WarpStarfield({ count = 120, speed = 1.8, warp = true }: Props) {
  const particlesInit = useCallback(async (engine: Engine) => {
    await loadSlim(engine);
  }, []);

  const options = useMemo<ISourceOptions>(
    () => ({
      fullScreen: false,
      fpsLimit: 60,
      particles: {
        number: { value: count, density: { enable: true, area: 1200 } },
        color: { value: ["#22d3ee", "#60a5fa", "#a78bfa", "#ffffff", "#94a3b8"] },
        shape: { type: "circle" },
        opacity: {
          value: { min: 0.15, max: 0.8 },
          animation: { enable: true, speed: 0.6, minimumValue: 0.1, sync: false },
        },
        size: {
          value: { min: 0.5, max: 2.2 },
          animation: { enable: true, speed: 1.5, minimumValue: 0.3, sync: false },
        },
        move: {
          enable: true,
          speed: { min: speed * 0.3, max: speed },
          direction: "none" as const,
          outModes: { default: "out" as const },
          straight: false,
          ...(warp
            ? {
                trail: { enable: true, length: 6, fill: { color: "#06060a" } },
              }
            : {}),
        },
        twinkle: {
          particles: { enable: true, frequency: 0.04, color: "#22d3ee", opacity: 1 },
        },
      },
      interactivity: {
        events: {
          onHover: { enable: true, mode: "grab" as const },
        },
        modes: {
          grab: { distance: 140, links: { opacity: 0.15, color: "#22d3ee" } },
        },
      },
      detectRetina: true,
    }),
    [count, speed, warp],
  );

  return (
    <Particles
      id="warp-starfield"
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
      init={particlesInit}
      options={options}
    />
  );
}
