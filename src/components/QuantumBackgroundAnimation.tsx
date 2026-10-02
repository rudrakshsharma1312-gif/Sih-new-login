import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/lib/theme";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseRadius: number;
  color: string;
  alpha: number;
  phase: number;
  spin: number;
  freq: number;
  orbitRadius: number;
  orbitAngle: number;
  orbitSpeed: number;
  originX: number;
  originY: number;
}

interface QuantumWave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  speed: number;
  alpha: number;
  color: string;
  lineWidth: number;
}

interface QuantumBackgroundAnimationProps {
  /**
   * "intro": More prominent quantum opening pulse, larger wave expansion, and HUD badges
   * "subtle": Ambient, softer opacity for dashboard workspaces
   */
  variant?: "intro" | "subtle";
  showHudBadge?: boolean;
}

export function QuantumBackgroundAnimation({
  variant = "intro",
  showHudBadge = true,
}: QuantumBackgroundAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { theme } = useTheme();
  const [openingPhase, setOpeningPhase] = useState<"opening" | "converged">("opening");
  const [isUpperRingActive, setIsUpperRingActive] = useState(true);
  const isUpperRingActiveRef = useRef(true);

  useEffect(() => {
    // Upper ring animates actively for the first 4 seconds, then smoothly fades out
    const upperTimer = setTimeout(() => {
      isUpperRingActiveRef.current = false;
      setIsUpperRingActive(false);
      setOpeningPhase("converged");
    }, 4200);

    return () => clearTimeout(upperTimer);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const isDark = theme !== "light";

    // Quantum Palette
    const emberColor = isDark ? "rgba(255, 211, 88," : "rgba(230, 160, 20,"; // #FFD358
    const cyanColor = isDark ? "rgba(56, 189, 248," : "rgba(2, 132, 199,"; // #38BDF8
    const violetColor = isDark ? "rgba(168, 85, 247," : "rgba(124, 58, 237,"; // #A855F7
    const emeraldColor = isDark ? "rgba(52, 211, 153," : "rgba(5, 150, 105,"; // #34D399

    const palette = [emberColor, cyanColor, violetColor, emeraldColor];

    // Opening Upper Wave Packets (only active for the first few seconds)
    const upperWaves: QuantumWave[] = [];
    const upperCenterX = width / 2;
    const upperCenterY = height * 0.38;

    const waveCount = variant === "intro" ? 5 : 3;
    for (let i = 0; i < waveCount; i++) {
      upperWaves.push({
        x: upperCenterX,
        y: upperCenterY,
        radius: i * 65,
        maxRadius: Math.max(width, height) * 1.1,
        speed: 2.2 + i * 0.45,
        alpha: variant === "intro" ? 0.75 - i * 0.1 : 0.35 - i * 0.08,

        color: palette[i % palette.length]!,
        lineWidth: 1.5 + (waveCount - i) * 0.4,
      });
    }

    // Continuous Lower Wave Animation (moves as it is continuously)
    const lowerWaves: QuantumWave[] = [];
    const lowerCenterX = width * 0.52;
    const lowerCenterY = height * 0.72;
    const lowerCount = 3;
    for (let i = 0; i < lowerCount; i++) {
      lowerWaves.push({
        x: lowerCenterX,
        y: lowerCenterY,
        radius: i * 75 + 20,
        maxRadius: Math.max(width, height) * 0.8,
        speed: 1.2 + i * 0.3,
        alpha: isDark ? 0.22 - i * 0.05 : 0.12 - i * 0.03,
        color: cyanColor,
        lineWidth: 1.2,
      });
    }

    // Particle Swarm (QPSO delta-potential attractors)
    const particleCount = variant === "intro" ? 42 : 24;
    const particles: Particle[] = [];

    // Anchor attractors (mimicking hub centroids across the route map)
    const attractors = [
      { x: width * 0.5, y: height * 0.38 }, // Central Peenya Depot attractor (upper)
      { x: width * 0.28, y: height * 0.48 }, // West Hub
      { x: width * 0.72, y: height * 0.45 }, // East Tech Hub
      { x: width * 0.4, y: height * 0.7 }, // South Corridor (lower)
      { x: width * 0.65, y: height * 0.68 }, // Southeast Corridor (lower)
    ];

    for (let i = 0; i < particleCount; i++) {
      // attractors has 5 elements, i % attractors.length is always in-bounds

      const attractor = attractors[i % attractors.length]!;
      const orbitRad = 40 + Math.random() * (width > 768 ? 220 : 130);
      const angle = Math.random() * Math.PI * 2;

      particles.push({
        x: attractor.x + Math.cos(angle) * orbitRad,
        y: attractor.y + Math.sin(angle) * orbitRad,
        vx: (Math.random() - 0.5) * 0.7,
        vy: (Math.random() - 0.5) * 0.7,
        baseRadius: 1.5 + Math.random() * 2.2,

        color: palette[Math.floor(Math.random() * palette.length)]!,
        alpha: 0.3 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.03,
        freq: 0.015 + Math.random() * 0.02,
        orbitRadius: orbitRad,
        orbitAngle: angle,
        orbitSpeed: (0.003 + Math.random() * 0.007) * (Math.random() > 0.5 ? 1 : -1),
        originX: attractor.x,
        originY: attractor.y,
      });
    }

    // Track mouse interaction for quantum observer effect
    let mouseX = -9999;
    let mouseY = -9999;
    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };
    window.addEventListener("mousemove", handleMouseMove, { passive: true });

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      // Re-anchor attractors on resize
      attractors[0] = { x: width * 0.5, y: height * 0.38 };
      attractors[1] = { x: width * 0.28, y: height * 0.48 };
      attractors[2] = { x: width * 0.72, y: height * 0.45 };
      attractors[3] = { x: width * 0.4, y: height * 0.7 };
      attractors[4] = { x: width * 0.65, y: height * 0.68 };

      particles.forEach((p, idx) => {
        const attractor = attractors[idx % attractors.length]!;
        p.originX = attractor.x;
        p.originY = attractor.y;
      });
    };
    window.addEventListener("resize", handleResize);

    let frame = 0;

    const render = () => {
      frame++;
      ctx.clearRect(0, 0, width, height);

      // 1. Draw Upper Wave Rings (Only active for first few seconds, then finishes and fades out)
      for (let i = upperWaves.length - 1; i >= 0; i--) {
        const wave = upperWaves[i]!;
        wave.radius += wave.speed;
        const progress = wave.radius / wave.maxRadius;
        const currentAlpha = Math.max(0, wave.alpha * (1 - progress));

        if (currentAlpha > 0.005) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
          ctx.strokeStyle = `${wave.color} ${currentAlpha})`;
          ctx.lineWidth = wave.lineWidth;
          ctx.setLineDash([8, 12]);
          ctx.stroke();

          // Concentric faint glow aura
          ctx.beginPath();
          ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
          ctx.strokeStyle = `${wave.color} ${currentAlpha * 0.35})`;
          ctx.lineWidth = wave.lineWidth * 3.5;
          ctx.stroke();
          ctx.restore();
        } else if (isUpperRingActiveRef.current) {
          // Only re-loop during the initial opening seconds
          wave.radius = 20;
          wave.alpha = variant === "intro" ? 0.32 : 0.16;
          wave.speed = 1.3 + Math.random() * 0.6;
        }
      }

      // 2. Draw Continuous Lower Wave Rings (Moves as it is continuously)
      for (let i = lowerWaves.length - 1; i >= 0; i--) {
        const wave = lowerWaves[i]!;
        wave.radius += wave.speed;
        const progress = wave.radius / wave.maxRadius;
        const currentAlpha = Math.max(0, wave.alpha * (1 - progress));

        if (currentAlpha > 0.005) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
          ctx.strokeStyle = `${wave.color} ${currentAlpha})`;
          ctx.lineWidth = wave.lineWidth;
          ctx.setLineDash([6, 14]);
          ctx.stroke();
          ctx.restore();
        } else {
          // Continuously re-loop the lower wave animation as it is
          wave.radius = 15;
          wave.alpha = isDark ? 0.18 : 0.1;
          wave.speed = 0.9 + Math.random() * 0.4;
        }
      }

      // 2. Draw Quantum Coordinate Grid Resonance
      const gridSize = width > 768 ? 64 : 48;
      const pulseOpacity = (Math.sin(frame * 0.02) * 0.5 + 0.5) * (isDark ? 0.045 : 0.025);
      ctx.save();
      ctx.strokeStyle = isDark
        ? `rgba(255, 211, 88, ${pulseOpacity})`
        : `rgba(20, 20, 20, ${pulseOpacity})`;
      ctx.lineWidth = 0.5;
      ctx.setLineDash([2, 6]);

      // Draw faint crosshairs at attractor centroids
      attractors.forEach((att) => {
        const rad = 14 + Math.sin(frame * 0.04 + att.x) * 4;
        ctx.beginPath();
        ctx.arc(att.x, att.y, rad, 0, Math.PI * 2);
        ctx.strokeStyle = `${emberColor} ${isDark ? 0.22 : 0.12})`;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(att.x - 18, att.y);
        ctx.lineTo(att.x + 18, att.y);
        ctx.moveTo(att.x, att.y - 18);
        ctx.lineTo(att.x, att.y + 18);
        ctx.strokeStyle = `${cyanColor} ${isDark ? 0.28 : 0.15})`;
        ctx.stroke();
      });
      ctx.restore();

      // 3. Draw Quantum Entanglement Filaments between close particles
      const maxConnectDistance = width > 768 ? 135 : 90;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const pi = particles[i]!;

          const pj = particles[j]!;
          const dx = pi.x - pj.x;
          const dy = pi.y - pj.y;
          const dist = Math.hypot(dx, dy);

          if (dist < maxConnectDistance) {
            const filamentAlpha = (1 - dist / maxConnectDistance) * (isDark ? 0.22 : 0.12);
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(pi.x, pi.y);
            ctx.lineTo(pj.x, pj.y);
            ctx.strokeStyle = `${pi.color} ${filamentAlpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();

            // Occasional quantum photon pulse packet traveling along the filament
            if ((frame + i * 11) % 80 === 0) {
              const t = (frame % 80) / 80;
              const px = pi.x + dx * -t;
              const py = pi.y + dy * -t;
              ctx.beginPath();
              ctx.arc(px, py, 1.8, 0, Math.PI * 2);
              ctx.fillStyle = `${emberColor} 0.85)`;
              ctx.shadowColor = "#FFD358";
              ctx.shadowBlur = 6;
              ctx.fill();
            }
            ctx.restore();
          }
        }
      }

      // 4. Update and Render Quantum Particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]!;

        // Orbit around attractor with quantum harmonic perturbation
        p.orbitAngle += p.orbitSpeed;
        const wavePerturbation = Math.sin(frame * p.freq + p.phase) * 16;
        const targetX = p.originX + Math.cos(p.orbitAngle) * (p.orbitRadius + wavePerturbation);
        const targetY = p.originY + Math.sin(p.orbitAngle) * (p.orbitRadius + wavePerturbation);

        // Smooth convergence
        p.x += (targetX - p.x) * 0.05 + p.vx;
        p.y += (targetY - p.y) * 0.05 + p.vy;

        // Quantum observer interaction: subtle deflection if cursor is nearby
        const distToMouse = Math.hypot(p.x - mouseX, p.y - mouseY);
        if (distToMouse < 140) {
          const repelForce = (1 - distToMouse / 140) * 2.5;
          const angleToMouse = Math.atan2(p.y - mouseY, p.x - mouseX);
          p.x += Math.cos(angleToMouse) * repelForce;
          p.y += Math.sin(angleToMouse) * repelForce;
        }

        // Particle Glow & Superposition Shell
        const dynamicAlpha = p.alpha * (0.7 + Math.sin(frame * 0.05 + p.phase) * 0.3);
        const scaleFactor = isDark ? 1 : 0.85;

        ctx.save();
        // Quantum superposition halo
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.baseRadius * 3.5 * scaleFactor, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color} ${dynamicAlpha * (isDark ? 0.18 : 0.09)})`;
        ctx.fill();

        // Core particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.baseRadius * scaleFactor, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color} ${dynamicAlpha})`;
        ctx.shadowColor = p.color.includes("255, 211, 88") ? "#FFD358" : "#38BDF8";
        ctx.shadowBlur = isDark ? 8 : 4;
        ctx.fill();

        // Orbital spin trace (quantum spin vector)
        ctx.beginPath();
        const spinRadius = p.baseRadius * 2.2;
        ctx.arc(p.x, p.y, spinRadius, frame * p.spin, frame * p.spin + Math.PI * 0.95);
        ctx.strokeStyle = `${p.color} ${dynamicAlpha * 0.45})`;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
    };
  }, [theme, variant]);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none"
      aria-hidden="true"
    >
      {/* HTML5 Canvas for silky 60fps quantum particle & wave rendering */}
      <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" />

      {/* Atmospheric Quantum Vignette & Radial Energy Centers */}
      <div className="absolute inset-0 bg-radial-gradient pointer-events-none" />

      {/* Upper Wave Pulse Ring: Moves actively for first few seconds, then gracefully fades out */}
      <div
        className={`absolute top-[38%] left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-all duration-1000 ${
          isUpperRingActive ? "opacity-100 scale-100" : "opacity-0 scale-125 pointer-events-none"
        }`}
      >
        <div className="size-4 rounded-full bg-ember/60 animate-ping duration-1000" />
        <div className="absolute inset-[-40px] rounded-full border border-ember/30 animate-[ping_2.4s_cubic-bezier(0,0,0.2,1)_infinite]" />
        <div className="absolute inset-[-120px] rounded-full border border-azure/20 animate-[ping_3.2s_cubic-bezier(0,0,0.2,1)_infinite]" />
      </div>

      {/* Lower Continuous Animation Ring: Moves continuously as it is */}
      <div className="absolute bottom-[22%] left-1/2 -translate-x-1/2 pointer-events-none">
        <div className="size-3 rounded-full bg-azure/50 animate-ping duration-1500" />
        <div className="absolute inset-[-30px] rounded-full border border-azure/25 animate-[ping_3.6s_cubic-bezier(0,0,0.2,1)_infinite]" />
        <div className="absolute inset-[-85px] rounded-full border border-violet/20 animate-[ping_4.8s_cubic-bezier(0,0,0.2,1)_infinite]" />
      </div>

      {/* Ambient glowing quantum energy wells (continuous lower animation) */}
      <div className="absolute -top-36 left-1/2 h-[520px] w-[860px] -translate-x-1/2 rounded-full bg-gradient-to-b from-ember/15 via-ember/5 to-transparent blur-[140px]" />
      <div className="absolute bottom-12 right-12 h-[420px] w-[420px] rounded-full bg-azure/10 blur-[130px] animate-pulse [animation-duration:5s]" />
      <div className="absolute bottom-8 left-1/4 h-[360px] w-[360px] rounded-full bg-violet/10 blur-[120px] animate-pulse [animation-duration:7s]" />

      {/* Subtle Quantum Telemetry Badge (Only on opening intro page) */}
      {showHudBadge && (
        <div className="absolute bottom-4 left-6 z-10 hidden md:flex items-center gap-2.5 rounded-full border border-line/60 bg-obsidian/70 px-3.5 py-1.5 backdrop-blur-md shadow-xs">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ember opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-ember" />
          </span>
          <span className="font-mono text-[10px] text-foreground tracking-wider uppercase">
            Ψ(x,t) Quantum Swarm Space Active
          </span>
          <span className="h-2.5 w-px bg-line" />
          <span className="font-mono text-[9px] text-mist">
            {openingPhase === "opening"
              ? "Initializing Potential Well..."
              : "Delta Attractors Converged"}
          </span>
        </div>
      )}
    </div>
  );
}
