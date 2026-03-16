/**
 * HoloGlobe — 星鑑全息掃描儀
 *
 * 精準掃描模式：
 * - 掃描環（橫向往復掃描線）
 * - 赤道 / 子午線定位格線
 * - 旋轉掃描光束
 * - 目標鎖定光點（隨機閃爍）
 * - Fresnel 光暈外球
 */
import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Sphere, OrbitControls, Stars } from "@react-three/drei";
import * as THREE from "three";
import type { Mesh, Group } from "three";

// ─── 掃描環（水平往復） ───────────────────────────────────
function ScanRing() {
  const ringRef = useRef<Mesh>(null);
  const dirRef = useRef(1);
  const posRef = useRef(0);

  useFrame((_, delta) => {
    if (!ringRef.current) return;
    posRef.current += delta * 0.6 * dirRef.current;
    if (posRef.current > 1.15) dirRef.current = -1;
    if (posRef.current < -1.15) dirRef.current = 1;
    ringRef.current.position.y = posRef.current;
    // 根據位置計算半徑（球面截圓）
    const r = Math.sqrt(Math.max(0, 1.22 * 1.22 - posRef.current * posRef.current));
    ringRef.current.scale.setScalar(r / 1.22);
  });

  return (
    <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[1.22, 0.008, 8, 80]} />
      <meshBasicMaterial color="#22d3ee" transparent opacity={0.85} />
    </mesh>
  );
}

// ─── 旋轉掃描光束 ─────────────────────────────────────────
function ScanBeam() {
  const groupRef = useRef<Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.9;
    }
  });

  return (
    <group ref={groupRef}>
      {/* 主光束 */}
      <mesh rotation={[0, 0, 0]}>
        <planeGeometry args={[0.012, 2.6]} />
        <meshBasicMaterial
          color="#22d3ee"
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* 光束拖尾（扇形） */}
      <mesh rotation={[0, -0.18, 0]}>
        <planeGeometry args={[0.008, 2.6]} />
        <meshBasicMaterial
          color="#22d3ee"
          transparent
          opacity={0.2}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh rotation={[0, -0.36, 0]}>
        <planeGeometry args={[0.004, 2.6]} />
        <meshBasicMaterial
          color="#22d3ee"
          transparent
          opacity={0.08}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

// ─── 定位格線（赤道 + 子午線） ────────────────────────────
function GridLines() {
  return (
    <>
      {/* 赤道 */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.22, 0.004, 8, 120]} />
        <meshBasicMaterial color="#818cf8" transparent opacity={0.5} />
      </mesh>
      {/* 子午線 0° */}
      <mesh rotation={[0, 0, 0]}>
        <torusGeometry args={[1.22, 0.004, 8, 120]} />
        <meshBasicMaterial color="#818cf8" transparent opacity={0.35} />
      </mesh>
      {/* 子午線 90° */}
      <mesh rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[1.22, 0.004, 8, 120]} />
        <meshBasicMaterial color="#818cf8" transparent opacity={0.25} />
      </mesh>
      {/* 緯線 ±45° */}
      {[-0.75, 0.75].map((y, i) => {
        const r = Math.sqrt(Math.max(0, 1.22 * 1.22 - y * y));
        return (
          <mesh key={i} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[r, 0.003, 8, 100]} />
            <meshBasicMaterial color="#6366f1" transparent opacity={0.2} />
          </mesh>
        );
      })}
    </>
  );
}

// ─── 目標鎖定光點 ─────────────────────────────────────────
function TargetDots() {
  const dotsRef = useRef<Group>(null);
  const timeRef = useRef(0);

  // 固定幾個球面座標（隨機撒點）
  const dots = useMemo(() => {
    const pts: { pos: [number, number, number]; phase: number }[] = [];
    const fixed = [
      [0.4, 0.8, 0.9],
      [-0.7, 0.5, 0.85],
      [0.9, -0.3, 0.7],
      [-0.3, -0.85, 0.75],
      [0.6, 0.6, -0.8],
      [-0.8, -0.4, -0.65],
    ];
    fixed.forEach((v, i) => {
      const [x, y, z] = v;
      const len = Math.sqrt(x * x + y * y + z * z);
      pts.push({
        pos: [(x / len) * 1.23, (y / len) * 1.23, (z / len) * 1.23],
        phase: i * 1.1,
      });
    });
    return pts;
  }, []);

  useFrame((state) => {
    timeRef.current = state.clock.elapsedTime;
    if (!dotsRef.current) return;
    dotsRef.current.children.forEach((child, i) => {
      const pulse = Math.sin(timeRef.current * 2.5 + dots[i]?.phase ?? 0);
      child.scale.setScalar(0.5 + pulse * 0.5);
      (child as Mesh).material &&
        ((child as Mesh).material as THREE.MeshBasicMaterial).setValues({
          opacity: 0.4 + pulse * 0.6,
        });
    });
  });

  return (
    <group ref={dotsRef}>
      {dots.map((d, i) => (
        <mesh key={i} position={d.pos}>
          <sphereGeometry args={[0.025, 8, 8]} />
          <meshBasicMaterial color="#f87171" transparent opacity={0.8} />
        </mesh>
      ))}
    </group>
  );
}

// ─── 外光暈球 ─────────────────────────────────────────────
function FresnelHalo() {
  const ref = useRef<Mesh>(null);
  useFrame((state) => {
    if (ref.current) {
      const t = state.clock.elapsedTime;
      (ref.current.material as THREE.MeshBasicMaterial).opacity =
        0.06 + Math.sin(t * 1.2) * 0.02;
    }
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[1.38, 32, 32]} />
      <meshBasicMaterial color="#22d3ee" transparent opacity={0.08} side={THREE.BackSide} />
    </mesh>
  );
}

// ─── 主球體 ───────────────────────────────────────────────
function GlobeCore() {
  const meshRef = useRef<Mesh>(null);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.1;
    }
  });

  return (
    <>
      {/* 外 wireframe */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[1.22, 36, 36]} />
        <meshBasicMaterial color="#22d3ee" wireframe transparent opacity={0.12} />
      </mesh>

      {/* 內核 */}
      <Sphere args={[1.0, 32, 32]}>
        <meshStandardMaterial color="#04040a" transparent opacity={0.92} />
      </Sphere>

      {/* 定位格線 */}
      <GridLines />

      {/* 掃描光束 */}
      <ScanBeam />

      {/* 水平掃描環 */}
      <ScanRing />

      {/* 目標鎖定光點 */}
      <TargetDots />

      {/* Fresnel 外暈 */}
      <FresnelHalo />

      {/* 外光環 */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.65, 0.012, 16, 100]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.3} />
      </mesh>
      <mesh rotation={[Math.PI / 2.4, 0.3, 0]}>
        <torusGeometry args={[1.82, 0.007, 16, 100]} />
        <meshBasicMaterial color="#a78bfa" transparent opacity={0.18} />
      </mesh>

      {/* 燈光 */}
      <pointLight position={[3, 2, 4]} intensity={1.0} color="#22d3ee" />
      <pointLight position={[-3, -1, -2]} intensity={0.4} color="#a78bfa" />
      <pointLight position={[0, 3, 0]} intensity={0.3} color="#f87171" />
      <ambientLight intensity={0.12} />
    </>
  );
}

// ─── 匯出元件 ─────────────────────────────────────────────

interface Props {
  height?: number;
  showStars?: boolean;
  interactive?: boolean;
}

export default function HoloGlobe({ height = 320, showStars = true, interactive = false }: Props) {
  const canvasStyle = useMemo(() => ({ height, background: "transparent" }), [height]);

  return (
    <div className="relative w-full" style={canvasStyle}>
      <Canvas
        camera={{ position: [0, 0, 4.5], fov: 45 }}
        style={{ background: "transparent" }}
        gl={{ alpha: true, antialias: true }}
      >
        <GlobeCore />
        {showStars && (
          <Stars radius={50} depth={40} count={1500} factor={3} saturation={0.2} fade speed={0.5} />
        )}
        {interactive && <OrbitControls enableZoom={false} enablePan={false} autoRotate={false} />}
      </Canvas>

      {/* HUD 覆蓋層 */}
      <div className="absolute inset-0 pointer-events-none">
        {/* 四角定位框 */}
        {[
          "top-3 left-3 border-t border-l",
          "top-3 right-3 border-t border-r",
          "bottom-3 left-3 border-b border-l",
          "bottom-3 right-3 border-b border-r",
        ].map((cls, i) => (
          <div key={i} className={`absolute w-4 h-4 ${cls} border-cyan-400/60`} />
        ))}

        {/* 底部狀態列 */}
        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-4 text-[9px] text-cyan-400/60 font-mono">
          <span>SCAN ACTIVE</span>
          <span className="text-red-400/70">6 TARGETS LOCKED</span>
          <span>360° COVERAGE</span>
        </div>
      </div>
    </div>
  );
}
