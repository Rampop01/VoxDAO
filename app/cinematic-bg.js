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
  const PARTICLE_COUNT = 55;
  const MAX_DISTANCE = 140;
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
      this.vx = (Math.random() - 0.5) * 0.45;
      this.vy = (Math.random() - 0.5) * 0.45;
      this.radius = Math.random() * 1.8 + 0.8;
      this.baseAlpha = Math.random() * 0.45 + 0.25;
      this.alpha = this.baseAlpha;
      this.pulseSpeed = Math.random() * 0.02 + 0.008;
      this.pulsePhase = Math.random() * Math.PI * 2;
      this.depth = Math.random() * 0.8 + 0.2; // Parallax depth factor
    }

    update(time) {
      this.x += this.vx;
      this.y += this.vy;

      // Mouse gentle repulsion / interaction
      if (mouse.active) {
        const dx = this.x - mouse.x;
        const dy = this.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 150 && dist > 0) {
          const force = ((150 - dist) / 150) * 0.8 * this.depth;
          this.x += (dx / dist) * force;
          this.y += (dy / dist) * force;
        }
      }

      // Wrap edges smoothly
      if (this.x < -20) this.x = width + 20;
      if (this.x > width + 20) this.x = -20;
      if (this.y < -20) this.y = height + 20;
      if (this.y > height + 20) this.y = -20;

      // Subtle breathing pulse
      this.pulsePhase += this.pulseSpeed;
      this.alpha = this.baseAlpha + Math.sin(this.pulsePhase) * 0.18;
      if (this.alpha < 0.1) this.alpha = 0.1;
      if (this.alpha > 0.85) this.alpha = 0.85;
    }

    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${this.alpha})`;
      ctx.fill();

      // Specular glow for prominent nodes
      if (this.radius > 1.8) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 3.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${this.alpha * 0.18})`;
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
          const lineAlpha = (1 - dist / MAX_DISTANCE) * 0.14 * (p1.alpha + p2.alpha) * 0.5;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = `rgba(255, 255, 255, ${lineAlpha})`;
          ctx.lineWidth = 0.75;
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
    const heroGlowX = width * 0.5 + Math.sin(time * 0.0004) * (width * 0.15);
    const heroGlowY = Math.min(height * 0.25, 220);
    const glowRadius = Math.max(width * 0.55, 450);

    const radialGrad = ctx.createRadialGradient(
      heroGlowX,
      heroGlowY,
      0,
      heroGlowX,
      heroGlowY,
      glowRadius
    );
    radialGrad.addColorStop(0, "rgba(255, 255, 255, 0.055)");
    radialGrad.addColorStop(0.35, "rgba(20, 24, 34, 0.45)");
    radialGrad.addColorStop(0.7, "rgba(5, 7, 10, 0.85)");
    radialGrad.addColorStop(1, "#000000");

    ctx.fillStyle = radialGrad;
    ctx.fillRect(0, 0, width, height);

    // 3. Subtle moving specular light beam across the top horizon
    const beamProgress = (time * 0.00015) % 1;
    const beamX = beamProgress * (width + 600) - 300;
    const beamGrad = ctx.createLinearGradient(beamX - 350, 0, beamX + 350, 0);
    beamGrad.addColorStop(0, "rgba(255, 255, 255, 0)");
    beamGrad.addColorStop(0.5, "rgba(255, 255, 255, 0.03)");
    beamGrad.addColorStop(1, "rgba(255, 255, 255, 0)");

    ctx.fillStyle = beamGrad;
    ctx.fillRect(0, 0, width, Math.min(height, 500));
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
