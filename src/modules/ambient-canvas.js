const TAU = Math.PI * 2;

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
const modulo = (value, divisor) => ((value % divisor) + divisor) % divisor;
const customValue = (node, name) => node.style.getPropertyValue(name).trim();
const customNumber = (node, name, fallback = 0) => {
  const parsed = Number.parseFloat(customValue(node, name));
  return Number.isFinite(parsed) ? parsed : fallback;
};

const createScene = (hub) => ({
  stars: [...hub.querySelectorAll('.star-glint')].map((node, index) => ({
    x: customNumber(node, '--x') / 100,
    y: customNumber(node, '--y') / 100,
    size: customNumber(node, '--s', 1.5),
    ray: customNumber(node, '--ray-w', 18),
    color: customValue(node, '--c') || '#ebdbb2',
    opacity: customNumber(node, '--o', 0.6),
    rotation: customNumber(node, '--r') * Math.PI / 180,
    duration: customNumber(node, '--t', 5.5),
    delay: customNumber(node, '--d'),
    depth: 0.35 + (index % 7) * 0.08,
  })),
  streams: [...hub.querySelectorAll('.stream-line')].map((node, index) => ({
    x: customNumber(node, '--x') / 100,
    y: customNumber(node, '--y') / 100,
    color: customValue(node, '--c') || '#8ec07c',
    opacity: customNumber(node, '--o', 0.5) * 0.76,
    fontSize: customNumber(node, '--fs', 12),
    rotation: customNumber(node, '--r') * Math.PI / 180,
    duration: customNumber(node, '--t', 12),
    delay: customNumber(node, '--d'),
    reverse: index % 2 === 1,
    text: node.querySelector('.stream-track span')?.textContent || '',
    patternWidth: 0,
  })),
  particles: [...hub.querySelectorAll('.edge-particle')].map((node) => ({
    fromX: customNumber(node, '--from-x') / 100,
    fromY: customNumber(node, '--from-y') / 100,
    size: customNumber(node, '--s', 3),
    color: customValue(node, '--c') || '#fabd2f',
    travelX: customNumber(node, '--tx'),
    travelY: customNumber(node, '--ty'),
    trail: customNumber(node, '--trail', 110),
    duration: customNumber(node, '--t', 2.2),
    delay: customNumber(node, '--d'),
  })),
  blooms: [...hub.querySelectorAll('.impact-bloom')].map((node) => ({
    x: customNumber(node, '--x'),
    y: customNumber(node, '--y'),
    size: customNumber(node, '--s', 22),
    duration: customNumber(node, '--t', 3.2),
    delay: customNumber(node, '--d'),
  })),
});

const starPulse = (phase) => {
  if (phase < 0.48 || phase > 0.68) return 0.06;
  if (phase < 0.52) return 0.06 + ((phase - 0.48) / 0.04) * 0.94;
  if (phase < 0.56) return 1 - ((phase - 0.52) / 0.04) * 0.78;
  if (phase < 0.61) return 0.22 + ((phase - 0.56) / 0.05) * 0.32;
  return 0.54 * (1 - (phase - 0.61) / 0.07);
};

const drawStar = (context, star, width, height, time, pointer, lightTheme) => {
  const phase = modulo(time + star.delay, star.duration) / star.duration;
  const pulse = starPulse(phase);
  const alpha = star.opacity * pulse * (lightTheme ? 0.66 : 1);
  if (alpha < 0.02) return;

  const x = star.x * width + pointer.x * star.depth * 10;
  const y = star.y * height + pointer.y * star.depth * 7;
  const ray = star.ray * (0.68 + pulse * 0.45);
  const cos = Math.cos(star.rotation);
  const sin = Math.sin(star.rotation);
  const halfRay = ray / 2;

  context.strokeStyle = star.color;
  context.lineWidth = 0.7;
  context.globalAlpha = alpha * 0.58;
  context.beginPath();
  context.moveTo(x - cos * halfRay, y - sin * halfRay);
  context.lineTo(x + cos * halfRay, y + sin * halfRay);
  context.moveTo(x + sin * halfRay, y - cos * halfRay);
  context.lineTo(x - sin * halfRay, y + cos * halfRay);
  context.stroke();

  context.fillStyle = star.color;
  context.globalAlpha = alpha;
  context.beginPath();
  context.arc(x, y, Math.max(0.7, star.size * (0.65 + pulse * 0.55)), 0, TAU);
  context.fill();
};

const drawStream = (context, stream, width, height, time, pointer, lightTheme) => {
  if (!stream.text || stream.patternWidth <= 0) return;

  const phase = modulo(time + stream.delay, stream.duration) / stream.duration;
  const direction = stream.reverse ? 1 : -1;
  const offset = direction * phase * stream.patternWidth;
  const start = -stream.patternWidth * 2 + modulo(offset, stream.patternWidth);

  context.save();
  context.translate(
    stream.x * width - pointer.x * 7,
    stream.y * height - pointer.y * 5,
  );
  context.rotate(stream.rotation);
  context.fillStyle = stream.color;
  context.globalAlpha = stream.opacity * (lightTheme ? 0.64 : 1);
  context.font = `${stream.fontSize}px "Fira Code", "Microsoft YaHei Mono", monospace`;
  context.textBaseline = 'middle';

  for (let x = start; x < width * 1.7; x += stream.patternWidth) {
    context.fillText(stream.text, x, 0);
  }
  context.restore();
};

const drawParticle = (context, particle, stage, time, pointer) => {
  const phase = modulo(time + particle.delay, particle.duration) / particle.duration;
  if (phase >= 0.47) return;

  const progress = phase / 0.47;
  const alpha = phase < 0.05
    ? phase / 0.05
    : phase > 0.41
      ? (0.47 - phase) / 0.06
      : 0.96;
  const x = stage.x + stage.width * particle.fromX + particle.travelX * progress + pointer.x * 12;
  const y = stage.y + stage.height * particle.fromY + particle.travelY * progress + pointer.y * 9;
  const magnitude = Math.hypot(particle.travelX, particle.travelY) || 1;
  const trailX = particle.travelX / magnitude * particle.trail;
  const trailY = particle.travelY / magnitude * particle.trail;

  context.strokeStyle = particle.color;
  context.globalAlpha = alpha * 0.52;
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(x - trailX, y - trailY);
  context.lineTo(x, y);
  context.stroke();

  context.fillStyle = particle.color;
  context.globalAlpha = alpha;
  context.beginPath();
  context.arc(x, y, particle.size / 2, 0, TAU);
  context.fill();
};

const drawBloom = (context, bloom, width, height, time, pointer) => {
  const phase = modulo(time + bloom.delay, bloom.duration) / bloom.duration;
  if (phase > 0.12) return;

  const progress = phase / 0.12;
  const alpha = Math.sin(progress * Math.PI) * 0.72;
  const radius = bloom.size * (0.35 + progress * 2.5);
  const x = width * 0.5 + bloom.x + pointer.x * 5;
  const y = height * 0.49 + bloom.y + pointer.y * 4;

  context.strokeStyle = '#fabd2f';
  context.globalAlpha = alpha;
  context.lineWidth = 1.2;
  context.beginPath();
  context.arc(x, y, radius, 0, TAU);
  context.stroke();

  context.fillStyle = '#fdf4cb';
  context.globalAlpha = alpha * 0.42;
  context.beginPath();
  context.arc(x, y, Math.max(1, radius * 0.18), 0, TAU);
  context.fill();
};

const createMeteor = (width, height, bornAt) => {
  const fromTop = Math.random() < 0.72;
  const x = fromTop ? Math.random() * width * 0.88 : -180;
  const y = fromTop ? -180 : Math.random() * height * 0.46;
  const travel = Math.max(width - x, height - y) + 220;

  return {
    bornAt,
    duration: clamp(travel / 760 + Math.random() * 0.35, 1.15, 2.35),
    x,
    y,
    travel,
    length: 120 + Math.random() * 90,
    color: Math.random() > 0.28 ? '#fabd2f' : '#8ec07c',
  };
};

const drawMeteor = (context, meteor, time) => {
  const progress = (time - meteor.bornAt) / meteor.duration;
  if (progress < 0 || progress > 1) return false;

  const eased = progress * (2 - progress);
  const x = meteor.x + meteor.travel * eased;
  const y = meteor.y + meteor.travel * eased;
  const alpha = Math.sin(progress * Math.PI) * 0.9;
  const trail = meteor.length * (0.55 + alpha * 0.45);

  context.strokeStyle = meteor.color;
  context.globalAlpha = alpha * 0.76;
  context.lineWidth = 1.2;
  context.beginPath();
  context.moveTo(x - trail, y - trail);
  context.lineTo(x, y);
  context.stroke();

  context.fillStyle = '#fdf4cb';
  context.globalAlpha = alpha;
  context.beginPath();
  context.arc(x, y, 1.8, 0, TAU);
  context.fill();
  return true;
};

export const initAmbientCanvas = (hub, { constrained = false } = {}) => {
  const contextOptions = { alpha: true, desynchronized: true };
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', contextOptions);
  if (!context) return null;

  const scene = createScene(hub);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = window.matchMedia('(max-width: 760px)').matches;
  const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
  const layout = { left: 0, top: 0, width: 1, height: 1, pixelRatio: 1, stage: { x: 0, y: 0, width: 1, height: 1 } };
  const stats = { frames: 0, drawTime: 0, maxDrawTime: 0, measuredAt: performance.now(), measuredFrames: 0, fps: 0 };
  const meteors = [];
  let targetFrameMs = 1000 / (constrained ? 30 : mobile ? 45 : 60);
  let nextMeteorAt = 1.6;
  let nextBurstAt = 9 + Math.random() * 6;
  let lastFrameAt = 0;
  let animationFrame = 0;
  let running = false;
  let resizeFrame = 0;

  canvas.className = 'ambient-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  hub.prepend(canvas);
  hub.classList.add('is-ambient-canvas');

  const resize = () => {
    const hubRect = hub.getBoundingClientRect();
    const pixelRatioCap = constrained ? 1.15 : mobile ? 1.25 : 1.5;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, pixelRatioCap);

    layout.left = hubRect.left;
    layout.top = hubRect.top;
    layout.width = Math.max(1, hubRect.width);
    layout.height = Math.max(1, hubRect.height);
    layout.pixelRatio = pixelRatio;
    const stageWidth = mobile ? layout.width : Math.min(layout.width * 0.94, 920);
    const stageHeight = mobile ? 560 : Math.min(layout.width * 0.94, 680);
    const stageCenterY = layout.height * (mobile ? 0.55 : 0.52);
    layout.stage = {
      x: (layout.width - stageWidth) / 2,
      y: stageCenterY - stageHeight / 2,
      width: stageWidth,
      height: stageHeight,
    };

    canvas.width = Math.round(layout.width * pixelRatio);
    canvas.height = Math.round(layout.height * pixelRatio);
    canvas.style.width = `${layout.width}px`;
    canvas.style.height = `${layout.height}px`;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    for (const stream of scene.streams) {
      context.font = `${stream.fontSize}px "Fira Code", "Microsoft YaHei Mono", monospace`;
      stream.patternWidth = Math.max(160, context.measureText(stream.text).width + 42);
    }
  };

  const requestResize = () => {
    if (resizeFrame) return;
    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = 0;
      resize();
    });
  };

  const publishStats = (lastDrawTime) => {
    const now = performance.now();
    const interval = now - stats.measuredAt;
    if (interval >= 1000) {
      stats.fps = Math.round((stats.frames - stats.measuredFrames) * 1000 / interval);
      stats.measuredAt = now;
      stats.measuredFrames = stats.frames;
    }

    window.__byteforgeAmbientStats = {
      mode: 'canvas',
      targetFps: Math.round(1000 / targetFrameMs),
      fps: stats.fps,
      frames: stats.frames,
      averageDrawMs: Number((stats.drawTime / Math.max(1, stats.frames)).toFixed(3)),
      lastDrawMs: Number(lastDrawTime.toFixed(3)),
      maxDrawMs: Number(stats.maxDrawTime.toFixed(3)),
      pixelRatio: layout.pixelRatio,
      stars: scene.stars.length,
      streams: scene.streams.length,
      particles: scene.particles.length,
      blooms: scene.blooms.length,
      meteors: meteors.length,
    };
  };

  const draw = (timeMs) => {
    const drawStartedAt = performance.now();
    const time = timeMs / 1000;
    const lightTheme = hub.dataset.theme === 'light';
    pointer.x += (pointer.targetX - pointer.x) * 0.075;
    pointer.y += (pointer.targetY - pointer.y) * 0.075;

    context.clearRect(0, 0, layout.width, layout.height);
    for (const stream of scene.streams) drawStream(context, stream, layout.width, layout.height, time, pointer, lightTheme);
    for (const star of scene.stars) drawStar(context, star, layout.width, layout.height, time, pointer, lightTheme);
    for (const particle of scene.particles) drawParticle(context, particle, layout.stage, time, pointer);
    for (const bloom of scene.blooms) drawBloom(context, bloom, layout.width, layout.height, time, pointer);

    if (!reducedMotion) {
      if (time >= nextMeteorAt) {
        meteors.push(createMeteor(layout.width, layout.height, time));
        nextMeteorAt = time + (mobile ? 4.8 + Math.random() * 3.2 : 2.6 + Math.random() * 2.8);
      }
      if (time >= nextBurstAt) {
        const burstCount = mobile ? 1 : 2;
        for (let index = 0; index < burstCount; index += 1) {
          meteors.push(createMeteor(layout.width, layout.height, time + index * 0.22));
        }
        nextBurstAt = time + 12 + Math.random() * 9;
      }
    }

    for (let index = meteors.length - 1; index >= 0; index -= 1) {
      if (!drawMeteor(context, meteors[index], time)) {
        if (time > meteors[index].bornAt + meteors[index].duration) meteors.splice(index, 1);
      }
    }

    context.globalAlpha = 1;
    const drawTime = performance.now() - drawStartedAt;
    stats.frames += 1;
    stats.drawTime += drawTime;
    stats.maxDrawTime = Math.max(stats.maxDrawTime, drawTime);

    if (stats.frames % 30 === 0) {
      publishStats(drawTime);
      if (!constrained && stats.frames === 180 && stats.drawTime / stats.frames > 7) {
        targetFrameMs = 1000 / 30;
      }
    }
  };

  const tick = (now) => {
    if (!running) return;
    animationFrame = requestAnimationFrame(tick);
    if (now - lastFrameAt < targetFrameMs) return;
    lastFrameAt = now - modulo(now - lastFrameAt, targetFrameMs);
    draw(now);
  };

  const start = () => {
    if (running || reducedMotion) return;
    running = true;
    lastFrameAt = 0;
    animationFrame = requestAnimationFrame(tick);
  };

  const stop = () => {
    running = false;
    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = 0;
  };

  const syncVisibility = () => {
    hub.classList.toggle('is-page-hidden', document.hidden);
    if (document.hidden) stop();
    else start();
  };

  hub.addEventListener('pointermove', (event) => {
    pointer.targetX = clamp(((event.clientX - layout.left) / layout.width - 0.5) * 2, -1, 1);
    pointer.targetY = clamp(((event.clientY - layout.top) / layout.height - 0.5) * 2, -1, 1);
  }, { passive: true });
  hub.addEventListener('pointerleave', () => {
    pointer.targetX = 0;
    pointer.targetY = 0;
  }, { passive: true });
  document.addEventListener('visibilitychange', syncVisibility, { passive: true });
  window.addEventListener('resize', requestResize, { passive: true });

  const observer = 'ResizeObserver' in window ? new ResizeObserver(requestResize) : null;
  observer?.observe(hub);

  resize();
  draw(0);
  publishStats(0);
  syncVisibility();

  return {
    canvas,
    stop,
    resize: requestResize,
  };
};
