/**
 * HoloGlobe — React Three Fiber 3D 全息地球
 *
 * 帶有 wireframe + Fresnel 光暈效果的旋轉地球儀。
 * 用於 Dashboard 或 MDCI 頁面作為背景裝飾。
 */
import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Sphere, MeshDistortMaterial, OrbitControls, Stars } from "@react-three/drei";
import type { Mesh, Group } from "three";

function GlobeCore() {
  const meshRef = useRef<Mesh>(null);
  const ringRef = useRef<Group>(null);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.15;
    }
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * 0.08;
      ringRef.current.rotation.x += delta * 0.03;
    }
  });

  return (
    <>
      {/* 主球體 — 扭曲網格 */}
      <Sphere ref={meshRef} args={[1.2, 48, 48]}>
        <MeshDistortMaterial
          color="#22d3ee"
          wireframe
          distort={0.15}
          speed={1.5}
          transparent
          opacity={0.35}
        />
      </Sphere>

      {/* 內球 — 實心淡色核心 */}
      <Sphere args={[1.0, 32, 32]}>
        <meshStandardMaterial color="#06060a" transparent opacity={0.8} />
      </Sphere>

      {/* 光環 */}
      <group ref={ringRef}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.8, 0.015, 16, 100]} />
          <meshBasicMaterial color="#22d3ee" transparent opacity={0.4} />
        </mesh>
        <mesh rotation={[Math.PI / 2.3, 0.4, 0]}>
          <torusGeometry args={[2.0, 0.01, 16, 100]} />
          <meshBasicMaterial color="#a78bfa" transparent opacity={0.25} />
        </mesh>
      </group>

      {/* 點光源 */}
      <pointLight position={[3, 2, 4]} intensity={0.8} color="#22d3ee" />
      <pointLight position={[-3, -1, -2]} intensity={0.3} color="#a78bfa" />
      <ambientLight intensity={0.15} />
    </>
  );
}

interface Props {
  /** 容器高度，預設 320px */
  height?: number;
  /** 是否顯示星空背景 */
  showStars?: boolean;
  /** 是否允許使用者旋轉 */
  interactive?: boolean;
}

export default function HoloGlobe({ height = 320, showStars = true, interactive = false }: Props) {
  const canvasStyle = useMemo(
    () => ({ height, background: "transparent" }),
    [height],
  );

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
    </div>
  );
}
