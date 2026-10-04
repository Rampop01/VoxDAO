/**
 * VoxDAO Cinematic Background Engine
 * Luxury Obsidian Noir & Crystalline Consensus Mesh
 * Pure dark shiny black & chrome particle field with 60fps GPU rendering
 */

(function () {
  const canvas = document.getElementById("cinematicBgCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) return;

  let width = 0;
  let height = 0;
  let dpr = 1;
  let animationFrameId = null;

  // Configuration
  const PARTICLE_COUNT = 65;
  const MAX_DISTANCE = 150;
  const particles = [];
  const mouse = { x: -1000, y: -1000, targetX: -1000, targetY: -1000, active: false };

  // Resize handler with Retina support
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";

    ctx.scale(dpr, dpr);
  }

  // Particle representation
  class Particle {
    constructor() {
      this.reset(true);
    }

    reset(initial = false) {
      this.x = initial ? Math.random() * width : Math.random() < 0.5 ? 0 : width;
      this.y = initial ? Math.random() * height : Math.random() * height;
      this.vx = (Math.random() - 0.5) * 0.5;
      this.vy = (Math.random() - 0.5) * 0.5;
      this.radius = Math.random() * 2.2 + 1.0;
      this.baseAlpha = Math.random() * 0.4 + 0.45;
      this.alpha = this.baseAlpha;
      this.pulseSpeed = Math.random() * 0.02 + 0.01;
      this.pulsePhase = Math.random() * Math.PI * 2;
      this.depth = Math.random() * 0.8 + 0.2; // Parallax depth factor
    }

    update(time) {
      this.x += this.vx;
      this.y += this.vy;

      // Mouse gentle interaction
      if (mouse.active) {
        const dx = this.x - mouse.x;
        const dy = this.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 180 && dist > 0) {
          const force = ((180 - dist) / 180) * 1.2 * this.depth;
          this.x += (dx / dist) * force;
          this.y += (dy / dist) * force;
        }
      }

      // Wrap edges smoothly
      if (this.x < -30) this.x = width + 30;
      if (this.x > width + 30) this.x = -30;
      if (this.y < -30) this.y = height + 30;
      if (this.y > height + 30) this.y = -30;

      // Breathing pulse
      this.pulsePhase += this.pulseSpeed;
      this.alpha = this.baseAlpha + Math.sin(this.pulsePhase) * 0.22;
      if (this.alpha < 0.2) this.alpha = 0.2;
      if (this.alpha > 0.95) this.alpha = 0.95;
    }

    draw() {
      // Core particle
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${this.alpha})`;
      ctx.fill();

      // Specular glowing halo
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius * 3.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${this.alpha * 0.25})`;
      ctx.fill();

      // Large soft outer aura for prominent nodes
      if (this.radius > 2.0) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 7, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${this.alpha * 0.08})`;
        ctx.fill();
      }
    }
  }

  // Initialize particles
  function initParticles() {
    particles.length = 0;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push(new Particle());
    }
  }

  // Draw connecting filament lines
  function drawFilaments() {
    const len = particles.length;
    for (let i = 0; i < len; i++) {
      const p1 = particles[i];
      for (let j = i + 1; j < len; j++) {
        const p2 = particles[j];
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < MAX_DISTANCE) {
          const lineAlpha = (1 - dist / MAX_DISTANCE) * 0.3 * (p1.alpha + p2.alpha) * 0.5;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = `rgba(255, 255, 255, ${lineAlpha})`;
          ctx.lineWidth = 0.9;
          ctx.stroke();
        }
      }
    }
  }

  // Draw dynamic cinematic lighting glows
  function drawCinematicAtmosphere(time) {
    // 1. Base dark obsidian fill
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, width, height);

    // 2. Slow breathing hero anamorphic spotlight
    const heroGlowX = width * 0.5 + Math.sin(time * 0.0003) * (width * 0.12);
    const heroGlowY = Math.min(height * 0.22, 200);
    const glowRadius = Math.max(width * 0.6, 500);

    const radialGrad = ctx.createRadialGradient(
      heroGlowX,
      heroGlowY,
      0,
      heroGlowX,
      heroGlowY,
      glowRadius
    );
    radialGrad.addColorStop(0, "rgba(255, 255, 255, 0.09)");
    radialGrad.addColorStop(0.3, "rgba(22, 28, 40, 0.55)");
    radialGrad.addColorStop(0.65, "rgba(8, 11, 16, 0.9)");
    radialGrad.addColorStop(1, "#000000");

    ctx.fillStyle = radialGrad;
    ctx.fillRect(0, 0, width, height);

    // 3. Horizontal anamorphic lens flare line
    const flareY = Math.min(height * 0.22, 200);
    const flareGrad = ctx.createLinearGradient(0, flareY, width, flareY);
    flareGrad.addColorStop(0, "rgba(255, 255, 255, 0)");
    flareGrad.addColorStop(0.35, "rgba(255, 255, 255, 0.015)");
    flareGrad.addColorStop(0.5, "rgba(255, 255, 255, 0.08)");
    flareGrad.addColorStop(0.65, "rgba(255, 255, 255, 0.015)");
    flareGrad.addColorStop(1, "rgba(255, 255, 255, 0)");

    ctx.fillStyle = flareGrad;
    ctx.fillRect(0, flareY - 1, width, 2);

    // 4. Interactive cursor spotlight glow
    if (mouse.active) {
      const mouseGlow = ctx.createRadialGradient(
        mouse.x,
        mouse.y,
        0,
        mouse.x,
        mouse.y,
        320
      );
      mouseGlow.addColorStop(0, "rgba(255, 255, 255, 0.09)");
      mouseGlow.addColorStop(0.45, "rgba(255, 255, 255, 0.025)");
      mouseGlow.addColorStop(1, "rgba(0, 0, 0, 0)");

      ctx.fillStyle = mouseGlow;
      ctx.fillRect(0, 0, width, height);
    }
  }

  // Animation Loop
  function animate(time) {
    animationFrameId = requestAnimationFrame(animate);

    // Smooth mouse interpolation
    mouse.x += (mouse.targetX - mouse.x) * 0.08;
    mouse.y += (mouse.targetY - mouse.y) * 0.08;

    // Draw layers
    drawCinematicAtmosphere(time);

    // Update and draw particles
    for (let i = 0; i < particles.length; i++) {
      particles[i].update(time);
      particles[i].draw();
    }

    drawFilaments();
  }

  // Event Listeners
  window.addEventListener("resize", () => {
    resize();
    initParticles();
  });

  window.addEventListener("mousemove", (e) => {
    mouse.targetX = e.clientX;
    mouse.targetY = e.clientY;
    mouse.active = true;
  });

  window.addEventListener("mouseleave", () => {
    mouse.active = false;
    mouse.targetX = -1000;
    mouse.targetY = -1000;
  });

  // Handle tab visibility to save power
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    } else {
      animationFrameId = requestAnimationFrame(animate);
    }
  });

  // Start Engine
  resize();
  initParticles();
  animationFrameId = requestAnimationFrame(animate);
})();
