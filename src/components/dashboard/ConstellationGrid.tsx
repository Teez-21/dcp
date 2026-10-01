"use client";

import { useEffect, useRef } from "react";

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseX: number;
  baseY: number;
  radius: number;
  label: string;
  pulse: number;
}

export default function ConstellationGrid() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let animationFrame = 0;
    let lastTime = performance.now();
    let reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const nodes: Node[] = [];
    const mouse = { x: -1000, y: -1000, prevX: -1000, prevY: -1000, vx: 0, vy: 0, radius: 210 };

    const initNodes = () => {
      nodes.length = 0;
      const spacing = width < 640 ? 78 : 58;
      const cols = Math.ceil(width / spacing) + 1;
      const rows = Math.ceil(height / spacing) + 1;
      for (let i = 0; i < cols; i += 1) {
        for (let j = 0; j < rows; j += 1) {
          const x = i * spacing;
          const y = j * spacing;
          nodes.push({
            x,
            y,
            vx: 0,
            vy: 0,
            baseX: x,
            baseY: y,
            radius: Math.random() * 1.15 + 0.8,
            label: `${(i * 7).toString(16).toUpperCase().padStart(2, "0")}:${(j * 11).toString(16).toUpperCase().padStart(2, "0")}`,
            pulse: Math.random() * Math.PI * 2,
          });
        }
      }
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      initNodes();
    };

    const onPointerMove = (event: PointerEvent) => {
      mouse.x = event.clientX;
      mouse.y = event.clientY;
    };
    const onPointerLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };
    const onMotionChange = (event: MediaQueryListEvent) => {
      reducedMotion = event.matches;
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerleave", onPointerLeave);
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    media.addEventListener("change", onMotionChange);

    const render = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      const speed = Math.hypot(mouse.x - mouse.prevX, mouse.y - mouse.prevY) / Math.max(dt * 1000, 1);
      mouse.vx = (mouse.x - mouse.prevX) / Math.max(dt * 1000, 1);
      mouse.vy = (mouse.y - mouse.prevY) / Math.max(dt * 1000, 1);
      mouse.prevX = mouse.x;
      mouse.prevY = mouse.y;

      ctx.clearRect(0, 0, width, height);
      const isDark = document.documentElement.dataset.theme === "night";
      const nodeColor = isDark ? "226, 232, 240" : "35, 42, 74";
      const accentColor = isDark ? "103, 232, 249" : "49, 90, 149";
      const connectionAlpha = isDark ? 0.24 : 0.15;

      for (const node of nodes) {
        if (!reducedMotion) {
          node.pulse += dt * 2.4;
          const dx = mouse.x - node.x;
          const dy = mouse.y - node.y;
          const distance = Math.hypot(dx, dy);
          if (distance < mouse.radius && distance > 0) {
            const power = 1 - distance / mouse.radius;
            const force = power * (850 + speed * 90);
            node.vx -= (dx / distance) * force * dt;
            node.vy -= (dy / distance) * force * dt;
          }
          node.vx += (node.baseX - node.x) * 13 * dt;
          node.vy += (node.baseY - node.y) * 13 * dt;
          node.vx *= 0.86;
          node.vy *= 0.86;
          node.x += node.vx * dt * 60;
          node.y += node.vy * dt * 60;
        }
      }

      const maxDistance = 82;
      const maxDistanceSq = maxDistance * maxDistance;
      for (let i = 0; i < nodes.length; i += 1) {
        const node = nodes[i];
        for (let j = i + 1; j < nodes.length; j += 1) {
          const other = nodes[j];
          const dx = node.x - other.x;
          const dy = node.y - other.y;
          const distanceSq = dx * dx + dy * dy;
          if (distanceSq < maxDistanceSq) {
            const alpha = (1 - Math.sqrt(distanceSq) / maxDistance) * connectionAlpha;
            ctx.strokeStyle = `rgba(${nodeColor}, ${alpha})`;
            ctx.lineWidth = 0.65;
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(other.x, other.y);
            ctx.stroke();
          }
        }
      }

      for (const node of nodes) {
        const distance = Math.hypot(mouse.x - node.x, mouse.y - node.y);
        const near = distance < mouse.radius;
        const alpha = near ? 0.96 : 0.28 + Math.sin(node.pulse) * 0.12;
        const radius = near ? node.radius * 2.1 : node.radius + Math.sin(node.pulse) * 0.25;
        ctx.fillStyle = `rgba(${near ? accentColor : nodeColor}, ${Math.max(alpha, 0.08)})`;
        ctx.beginPath();
        ctx.arc(node.x, node.y, Math.max(radius, 0.5), 0, Math.PI * 2);
        ctx.fill();

        if (near && distance < 92 && !reducedMotion) {
          const ring = ((node.pulse * 16) % 28) + 5;
          ctx.strokeStyle = `rgba(${accentColor}, ${(1 - ring / 34) * 0.35})`;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.arc(node.x, node.y, ring, 0, Math.PI * 2);
          ctx.stroke();
          ctx.font = "8px ui-monospace, SFMono-Regular, Consolas, monospace";
          ctx.fillStyle = `rgba(${accentColor}, 0.76)`;
          ctx.fillText(node.label, node.x + 9, node.y - 9);
        }
      }

      animationFrame = requestAnimationFrame(render);
    };

    animationFrame = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
      media.removeEventListener("change", onMotionChange);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 z-[5] block h-full w-full opacity-[0.58] mix-blend-multiply dark:mix-blend-screen" />;
}
