import React, { useEffect, useRef } from "react";

const TAU = Math.PI * 2;

function createParticles(count) {
  // Distribute particles over a volume so front and back layers create depth.
  return Array.from({ length: count }, (_, index) => {
    const y = 1 - (index / (count - 1)) * 2;
    const radius = Math.sqrt(Math.max(0, 1 - y * y));
    const angle = index * 2.3999632297;
    return {
      seed: Math.random() * TAU,
      theta: angle,
      y,
      radius,
      depth: Math.random() * 2 - 1,
      size: 0.45 + Math.random() * 1.45,
      alpha: 0.32 + Math.random() * 0.68,
      speed: 0.12 + Math.random() * 0.34,
      hue: Math.random()
    };
  });
}

export function Orb({ mode = "idle", size = "normal" }) {
  const canvasRef = useRef(null);
  const modeRef = useRef(mode);
  const pointerRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0, active: false });

  modeRef.current = mode;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const context = canvas.getContext("2d", { alpha: true });
    const particles = createParticles(900);
    const bounds = { width: 0, height: 0, dpr: 1 };
    let frame = 0;
    let start = performance.now();

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      bounds.width = rect.width;
      bounds.height = rect.height;
      bounds.dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(rect.width * bounds.dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * bounds.dpr));
      context.setTransform(bounds.dpr, 0, 0, bounds.dpr, 0, 0);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const draw = now => {
      const elapsed = (now - start) / 1000;
      // State changes alter movement speed, convergence, and speaking pulses without rebuilding particles.
      const currentMode = modeRef.current;
      const listening = currentMode === "listening";
      const thinking = currentMode === "thinking";
      const speaking = currentMode === "speaking";
      const activity = listening ? 1.45 : thinking ? 1.12 : speaking ? 1.7 : 0.68;
      const pulse = speaking
        ? (Math.sin(elapsed * 7.4) + Math.sin(elapsed * 11.3) * 0.32) * 0.014
        : thinking
          ? Math.sin(elapsed * 2.4) * 0.025
          : Math.sin(elapsed * 1.5) * 0.012;
      // Smooth the pointer target so hover response feels physical rather than jittery.
      const pointer = pointerRef.current;
      const targetPointerX = pointer.active ? pointer.targetX : 0;
      const targetPointerY = pointer.active ? pointer.targetY : 0;
      pointer.x += (targetPointerX - pointer.x) * 0.08;
      pointer.y += (targetPointerY - pointer.y) * 0.08;

      context.clearRect(0, 0, bounds.width, bounds.height);
      const centerX = bounds.width / 2;
      const centerY = bounds.height / 2;
      const radius = Math.min(bounds.width, bounds.height) * (0.38 + pulse);
      const rotation = elapsed * 0.15 * activity;

      // Atmosphere stays in the canvas so it scales with the particle field.
      const aura = context.createRadialGradient(centerX, centerY, radius * 0.08, centerX, centerY, radius * 1.35);
      aura.addColorStop(0, speaking ? "rgba(82, 238, 255, .2)" : "rgba(56, 234, 255, .12)");
      aura.addColorStop(0.44, thinking ? "rgba(132, 100, 255, .1)" : "rgba(40, 125, 255, .07)");
      aura.addColorStop(1, "rgba(132, 100, 255, 0)");
      context.fillStyle = aura;
      context.beginPath();
      context.arc(centerX, centerY, radius * 1.35, 0, TAU);
      context.fill();

      const projected = [];
      particles.forEach(particle => {
        const flow = elapsed * particle.speed * activity;
        const wave = Math.sin(flow + particle.seed + particle.theta * 3) * (listening ? 0.035 : speaking ? 0.055 : 0.018);
        const convergence = thinking ? Math.sin(elapsed * 2.3 + particle.seed) * 0.045 : 0;
        const r = particle.radius * (1 + wave + convergence);
        const angle = particle.theta + rotation + Math.sin(particle.seed + elapsed * 0.2) * 0.035;
        const x3 = Math.cos(angle) * r;
        const y3 = particle.y;
        const z3 = Math.sin(angle) * r;
        const parallaxX = pointer.x * (0.05 + (z3 + 1) * 0.025);
        const parallaxY = pointer.y * (0.05 + (z3 + 1) * 0.02);
        const scale = 0.82 + (z3 + 1) * 0.16;
        const x = centerX + x3 * radius + parallaxX * radius;
        const y = centerY + y3 * radius + parallaxY * radius;
        const depth = (z3 + 1) / 2;
        const edge = Math.abs(y3) > 0.78 ? 0.76 : 1;
        projected.push({ x, y, z: z3, depth, size: particle.size * scale * edge, alpha: particle.alpha * (0.36 + depth * 0.64) });
      });

      projected.sort((a, b) => a.z - b.z);
      projected.forEach((particle, index) => {
        const hue = (index / projected.length + elapsed * 0.012) % 1;
        const color = hue < 0.48
          ? `rgba(56, ${Math.round(170 + hue * 130)}, 255, ${particle.alpha})`
          : `rgba(${Math.round(150 + hue * 100)}, ${Math.round(100 + (1 - hue) * 80)}, 255, ${particle.alpha})`;
        context.fillStyle = color;
        context.shadowBlur = particle.depth > 0.62 ? 5 : 2;
        context.shadowColor = color;
        context.beginPath();
        context.arc(particle.x, particle.y, particle.size * (speaking ? 1.08 : 1), 0, TAU);
        context.fill();
      });
      context.shadowBlur = 0;
      // One requestAnimationFrame loop keeps the field efficient and independent of React renders.
      frame = requestAnimationFrame(draw);
    };

    frame = requestAnimationFrame(draw);
    return () => {
      // Stop the loop and observer when the orb leaves the page.
      cancelAnimationFrame(frame);
      observer.disconnect();
      context.clearRect(0, 0, bounds.width, bounds.height);
    };
  }, []);

  const handlePointerMove = event => {
    const rect = event.currentTarget.getBoundingClientRect();
    pointerRef.current.targetX = (event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    pointerRef.current.targetY = (event.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
    pointerRef.current.active = true;
  };

  return (
    <div className={`orb ${mode} ${size}`} onPointerMove={handlePointerMove} onPointerLeave={() => { pointerRef.current.active = false; }}>
      <canvas ref={canvasRef} aria-label="Animated AI particle orb" role="img" />
      <span className="orbRipple" aria-hidden="true" />
    </div>
  );
}

export default Orb;
