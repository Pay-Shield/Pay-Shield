import React, { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  size: number;
  opacity: number;
  baseOpacity: number;
  twinkleSpeed: number;
  vx: number;
  vy: number;
}

interface NodePoint {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export const StarBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initStars();
      initNodes();
    };

    window.addEventListener('resize', handleResize);

    // Subtle star field
    let stars: Star[] = [];
    const starCount = Math.min(130, Math.floor((width * height) / 9500));

    const initStars = () => {
      stars = [];
      for (let i = 0; i < starCount; i++) {
        const baseOpacity = 0.15 + Math.random() * 0.45;
        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size: 0.5 + Math.random() * 0.9,
          opacity: baseOpacity,
          baseOpacity,
          twinkleSpeed: 0.005 + Math.random() * 0.015,
          vx: (Math.random() - 0.5) * 0.06,
          vy: -0.05 - Math.random() * 0.08, // slow upward drift
        });
      }
    };

    // Subtle network nodes
    let nodes: NodePoint[] = [];
    const nodeCount = Math.min(24, Math.floor(width / 65));

    const initNodes = () => {
      nodes = [];
      for (let i = 0; i < nodeCount; i++) {
        nodes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.15,
          vy: (Math.random() - 0.5) * 0.15,
          radius: 1.2,
        });
      }
    };

    initStars();
    initNodes();

    let time = 0;

    const render = () => {
      time += 0.015;
      ctx.clearRect(0, 0, width, height);

      // Deep dark navy/black radial gradient
      const bgGradient = ctx.createRadialGradient(
        width * 0.5,
        height * 0.25,
        50,
        width * 0.5,
        height * 0.5,
        Math.max(width, height)
      );
      bgGradient.addColorStop(0, '#0a1020');
      bgGradient.addColorStop(0.5, '#070B14');
      bgGradient.addColorStop(1, '#03060c');
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);

      // Subtle cyan/blue ambient radial glow for fintech aesthetic
      const glowGradient = ctx.createRadialGradient(
        width * 0.5,
        height * 0.2,
        10,
        width * 0.5,
        height * 0.2,
        width * 0.45
      );
      glowGradient.addColorStop(0, 'rgba(37, 99, 235, 0.06)');
      glowGradient.addColorStop(0.5, 'rgba(6, 182, 212, 0.03)');
      glowGradient.addColorStop(1, 'rgba(7, 11, 20, 0)');
      ctx.fillStyle = glowGradient;
      ctx.fillRect(0, 0, width, height);

      // Very faint grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.015)';
      ctx.lineWidth = 1;
      const gridSize = 60;
      const startX = 0;
      const startY = 0;

      for (let x = startX; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = startY; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Render connected network nodes (representing transaction networks)
      ctx.lineWidth = 0.75;
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        n.x += n.vx;
        n.y += n.vy;

        if (n.x < 0) n.x = width;
        else if (n.x > width) n.x = 0;
        if (n.y < 0) n.y = height;
        else if (n.y > height) n.y = 0;

        // Draw connections between nearby nodes
        for (let j = i + 1; j < nodes.length; j++) {
          const n2 = nodes[j];
          const dx = n.x - n2.x;
          const dy = n.y - n2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = 170;

          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * 0.06;
            ctx.strokeStyle = `rgba(59, 130, 246, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(n.x, n.y);
            ctx.lineTo(n2.x, n2.y);
            ctx.stroke();
          }
        }

        // Draw node
        ctx.fillStyle = 'rgba(6, 182, 212, 0.15)';
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Render stars with gentle twinkling and drift
      for (let i = 0; i < stars.length; i++) {
        const star = stars[i];
        star.x += star.vx;
        star.y += star.vy;

        // Wrap around
        if (star.y < 0) star.y = height;
        if (star.x < 0) star.x = width;
        if (star.x > width) star.x = 0;

        // Subtle twinkling
        const currentOpacity =
          star.baseOpacity + Math.sin(time + i) * (star.twinkleSpeed * 10);
        const clampedOpacity = Math.max(0.1, Math.min(0.7, currentOpacity));

        ctx.fillStyle = `rgba(255, 255, 255, ${clampedOpacity})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0 h-full w-full"
      style={{ display: 'block' }}
      aria-hidden="true"
    />
  );
};
