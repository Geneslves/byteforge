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
    driftRadiusX: 5 + (index % 6) * 1.7,
    driftRadiusY: 3 + (index % 5) * 1.35,
    driftDuration: 24 + (index % 9) * 2.9,
    driftPhase: modulo(index * 0.61803398875, 1) * TAU,
    hasRays: index % 5 === 0,
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
  particles: [...hub.querySelectorAll('.edge-particle')].map((node, index) => ({
    fromX: customNumber(node, '--from-x') / 100,
    fromY: customNumber(node, '--from-y') / 100,
    size: customNumber(node, '--s', 3),
    color: customValue(node, '--c') || '#fabd2f',
    travelX: customNumber(node, '--tx'),
    travelY: customNumber(node, '--ty'),
    trail: customNumber(node, '--trail', 110),
    phaseOffset: modulo(index * 0.61803398875, 1),
  })),
  blooms: [...hub.querySelectorAll('.impact-bloom')].map((node) => ({
    x: customNumber(node, '--x'),
    y: customNumber(node, '--y'),
    size: customNumber(node, '--s', 22),
    duration: customNumber(node, '--t', 3.2),
    delay: customNumber(node, '--d'),
  })),
});

const STAR_BASE_PULSE = 0.24;
const MAX_SCENE_DELTA_SECONDS = 0.05;
const PARTICLE_CYCLE_DURATION = 8.6;
const PARTICLE_ACTIVE_WINDOW = 0.105;

const starPulse = (phase) => {
  if (phase < 0.34 || phase > 0.76) return STAR_BASE_PULSE;
  if (phase < 0.44) return STAR_BASE_PULSE + ((phase - 0.34) / 0.1) * (1 - STAR_BASE_PULSE);
  if (phase < 0.52) return 1 - ((phase - 0.44) / 0.08) * 0.58;
  if (phase < 0.62) return 0.42 + ((phase - 0.52) / 0.1) * 0.3;
  return 0.72 - ((phase - 0.62) / 0.14) * (0.72 - STAR_BASE_PULSE);
};

const drawStar = (context, star, width, height, time, pointer, lightTheme) => {
  const twinkleDuration = star.duration * (lightTheme ? 1 : 0.72);
  const phase = modulo(time + star.delay, twinkleDuration) / twinkleDuration;
  const pulse = starPulse(phase);
  const alpha = star.opacity * pulse * (lightTheme ? 0.34 : 1);
  const twinkle = clamp((pulse - STAR_BASE_PULSE) / (1 - STAR_BASE_PULSE), 0, 1);

  const driftPhase = time / star.driftDuration * TAU + star.driftPhase;
  const x = star.x * width + Math.sin(driftPhase) * star.driftRadiusX + pointer.x * star.depth * 10;
  const y = star.y * height + Math.cos(driftPhase) * star.driftRadiusY + pointer.y * star.depth * 7;
  const rayStrength = (twinkle - 0.58) / 0.42;
  const ray = Math.min(star.ray, 15) * (0.62 + rayStrength * 0.38);
  const cos = Math.cos(star.rotation);
  const sin = Math.sin(star.rotation);
  const halfRay = ray / 2;
  const crossRay = halfRay * 0.34;

  if (star.hasRays && twinkle >= 0.58) {
    context.strokeStyle = star.color;
    context.lineWidth = 0.7;
    context.globalAlpha = alpha * rayStrength * (lightTheme ? 0.16 : 0.34);
    context.beginPath();
    context.moveTo(x - cos * halfRay, y - sin * halfRay);
    context.lineTo(x + cos * halfRay, y + sin * halfRay);
    context.moveTo(x + sin * crossRay, y - cos * crossRay);
    context.lineTo(x - sin * crossRay, y + cos * crossRay);
    context.stroke();
  }

  context.fillStyle = star.color;
  context.globalAlpha = alpha * (lightTheme ? 0.08 : 0.18);
  context.beginPath();
  context.arc(x, y, Math.max(1.2, star.size * (1.35 + twinkle * 0.5)), 0, TAU);
  context.fill();

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
  const phase = modulo(time / PARTICLE_CYCLE_DURATION + particle.phaseOffset, 1);
  if (phase >= PARTICLE_ACTIVE_WINDOW) return;

  const progress = phase / PARTICLE_ACTIVE_WINDOW;
  const alpha = phase < 0.02
    ? phase / 0.02
    : phase > 0.085
      ? (PARTICLE_ACTIVE_WINDOW - phase) / 0.02
      : 0.96;
  const x = stage.x + stage.width * particle.fromX + particle.travelX * progress + pointer.x * 12;
  const y = stage.y + stage.height * particle.fromY + particle.travelY * progress + pointer.y * 9;
  const magnitude = Math.hypot(particle.travelX, particle.travelY) || 1;
  const trailX = particle.travelX / magnitude * particle.trail;
  const trailY = particle.travelY / magnitude * particle.trail;
  const trailGradient = context.createLinearGradient(x - trailX, y - trailY, x, y);
  trailGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
  trailGradient.addColorStop(0.42, particle.color);
  trailGradient.addColorStop(0.82, particle.color);
  trailGradient.addColorStop(1, '#fdf4cb');
  context.lineCap = 'round';

  context.strokeStyle = trailGradient;
  context.globalAlpha = alpha * 0.24;
  context.lineWidth = particle.size * 2;
  context.beginPath();
  context.moveTo(x - trailX, y - trailY);
  context.lineTo(x, y);
  context.stroke();

  context.globalAlpha = alpha * 0.9;
  context.lineWidth = 1.25;
  context.beginPath();
  context.moveTo(x - trailX, y - trailY);
  context.lineTo(x, y);
  context.stroke();

  context.fillStyle = particle.color;
  context.globalAlpha = alpha * 0.24;
  context.beginPath();
  context.arc(x, y, particle.size * 1.45, 0, TAU);
  context.fill();

  context.fillStyle = '#fdf4cb';
  context.globalAlpha = alpha;
  context.beginPath();
  context.arc(x, y, particle.size * 0.55, 0, TAU);
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
  const angle = 0.68 + Math.random() * 0.18;
  const directionX = Math.cos(angle);
  const directionY = Math.sin(angle);
  const x = fromTop ? Math.random() * width * 0.45 - width * 0.2 : -70;
  const y = fromTop ? -70 : Math.random() * height * 0.35 - height * 0.05;
  const travel = Math.max(480, Math.min((width - x) / directionX, (height - y) / directionY) + 260);

  return {
    bornAt,
    duration: clamp(travel / 760 + Math.random() * 0.35, 1.15, 2.35),
    x,
    y,
    travel,
    directionX,
    directionY,
    length: 170 + Math.random() * 130,
    thickness: 1.4 + Math.random() * 0.8,
    color: Math.random() > 0.28 ? '#fabd2f' : '#8ec07c',
  };
};

const drawMeteor = (context, meteor, time) => {
  const progress = (time - meteor.bornAt) / meteor.duration;
  if (progress < 0 || progress > 1) return false;

  const eased = progress;
  const x = meteor.x + meteor.travel * eased * meteor.directionX;
  const y = meteor.y + meteor.travel * eased * meteor.directionY;
  const alpha = Math.sin(progress * Math.PI) * 0.9;
  const trail = meteor.length * (0.55 + alpha * 0.45);
  const trailX = trail * meteor.directionX;
  const trailY = trail * meteor.directionY;
  const outerTrail = context.createLinearGradient(x - trailX, y - trailY, x, y);
  outerTrail.addColorStop(0, 'rgba(130, 200, 238, 0)');
  outerTrail.addColorStop(0.22, 'rgba(130, 200, 238, 0.12)');
  outerTrail.addColorStop(0.52, 'rgba(170, 220, 245, 0.38)');
  outerTrail.addColorStop(0.8, 'rgba(232, 246, 255, 0.78)');
  outerTrail.addColorStop(1, 'rgba(255, 255, 255, 0.98)');
  const coreTrail = context.createLinearGradient(x - trailX, y - trailY, x, y);
  coreTrail.addColorStop(0, 'rgba(125, 198, 240, 0)');
  coreTrail.addColorStop(0.68, meteor.color);
  coreTrail.addColorStop(1, '#ffffff');
  context.lineCap = 'round';

  context.strokeStyle = outerTrail;
  context.globalAlpha = alpha * 0.84;
  context.lineWidth = meteor.thickness * 4.2;
  context.beginPath();
  context.moveTo(x - trailX, y - trailY);
  context.lineTo(x, y);
  context.stroke();

  context.strokeStyle = coreTrail;
  context.globalAlpha = alpha * 0.9;
  context.lineWidth = meteor.thickness * 1.2;
  context.beginPath();
  context.moveTo(x - trailX, y - trailY);
  context.lineTo(x, y);
  context.stroke();

  context.strokeStyle = '#fdf4cb';
  context.globalAlpha = alpha * 0.82;
  context.lineWidth = 0.7;
  context.beginPath();
  context.moveTo(x - trailX * 0.34, y - trailY * 0.34);
  context.lineTo(x, y);
  context.stroke();

  context.fillStyle = meteor.color;
  context.globalAlpha = alpha * 0.38;
  context.beginPath();
  context.arc(x, y, meteor.thickness * 4.4, 0, TAU);
  context.fill();

  context.fillStyle = '#fdf4cb';
  context.globalAlpha = alpha;
  context.beginPath();
  context.arc(x, y, meteor.thickness * 1.45, 0, TAU);
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
  const cadence = { lastRafAt: 0, rafIntervals: [], rafFrames: 0, refreshFps: 60, renderStride: constrained ? 2 : 1, lastDrawAt: 0, intervalTotal: 0, intervalSquared: 0, intervalSamples: 0, maxInterval: 0 };
  let meteorEvents = 0;
  let targetFrameMs = 0;
  let nextMeteorAt = 2.4 + Math.random() * 0.5;
  let nextBurstAt = 6 + Math.random() * 4;
  let lastFrameAt = 0;
  let lastSceneFrameAt = 0;
  let lastDrawSceneTime = 0;
  let sceneTime = 0;
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
      targetFps: targetFrameMs ? Math.round(1000 / targetFrameMs) : Math.round(cadence.refreshFps / cadence.renderStride),
      fps: stats.fps,
      frames: stats.frames,
      averageDrawMs: Number((stats.drawTime / Math.max(1, stats.frames)).toFixed(3)),
      lastDrawMs: Number(lastDrawTime.toFixed(3)),
      maxDrawMs: Number(stats.maxDrawTime.toFixed(3)),
      averageFrameMs: Number((cadence.intervalTotal / Math.max(1, cadence.intervalSamples)).toFixed(3)),
      frameJitterMs: Number(Math.sqrt(Math.max(0, cadence.intervalSquared / Math.max(1, cadence.intervalSamples) - (cadence.intervalTotal / Math.max(1, cadence.intervalSamples)) ** 2)).toFixed(3)),
      maxFrameMs: Number(cadence.maxInterval.toFixed(3)),
      refreshFps: Math.round(cadence.refreshFps),
      renderStride: cadence.renderStride,
      pixelRatio: layout.pixelRatio,
      stars: scene.stars.length,
      streams: scene.streams.length,
      particles: scene.particles.length,
      blooms: scene.blooms.length,
      meteors: meteors.length,
      meteorEvents,
    };
  };

  const draw = (timeMs, time = sceneTime) => {
    const drawStartedAt = performance.now();
    const lightTheme = hub.dataset.theme === 'light';
    if (cadence.lastDrawAt) {
      const interval = timeMs - cadence.lastDrawAt;
      if (interval > 0 && interval < 250) {
        cadence.intervalTotal += interval;
        cadence.intervalSquared += interval * interval;
        cadence.intervalSamples += 1;
        cadence.maxInterval = Math.max(cadence.maxInterval, interval);
      }
    }
    cadence.lastDrawAt = timeMs;
    const drawDelta = clamp(time - lastDrawSceneTime, 0, MAX_SCENE_DELTA_SECONDS * 3);
    const pointerBlend = 1 - Math.exp(-8 * drawDelta);
    lastDrawSceneTime = time;
    pointer.x += (pointer.targetX - pointer.x) * pointerBlend;
    pointer.y += (pointer.targetY - pointer.y) * pointerBlend;

    context.clearRect(0, 0, layout.width, layout.height);
    for (const stream of scene.streams) drawStream(context, stream, layout.width, layout.height, time, pointer, lightTheme);
    for (const star of scene.stars) drawStar(context, star, layout.width, layout.height, time, pointer, lightTheme);
    for (const particle of scene.particles) drawParticle(context, particle, layout.stage, time, pointer);
    for (const bloom of scene.blooms) drawBloom(context, bloom, layout.width, layout.height, time, pointer);

    if (!reducedMotion) {
      if (time >= nextMeteorAt) {
        if (meteors.length < 3) {
          meteors.push(createMeteor(layout.width, layout.height, time));
          meteorEvents += 1;
        }
        nextMeteorAt = time + (mobile ? 2.8 + Math.random() * 2.4 : 1.7 + Math.random() * 2.2);
      }
      if (time >= nextBurstAt) {
        const burstCount = mobile ? 1 : 2;
        for (let index = 0; index < burstCount; index += 1) {
          if (meteors.length >= 3) break;
          meteors.push(createMeteor(layout.width, layout.height, time + index * 0.22));
          meteorEvents += 1;
        }
        nextBurstAt = time + 8 + Math.random() * 8;
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
    if (lastSceneFrameAt) {
      const frameDelta = clamp(
        (now - lastSceneFrameAt) / 1000,
        0,
        MAX_SCENE_DELTA_SECONDS,
      );
      sceneTime += frameDelta;
    }
    lastSceneFrameAt = now;
    if (cadence.lastRafAt) {
      const interval = now - cadence.lastRafAt;
      if (interval > 2 && interval < 40 && cadence.rafIntervals.length < 24) {
        cadence.rafIntervals.push(interval);
        if (cadence.rafIntervals.length === 24) {
          const ordered = [...cadence.rafIntervals].sort((a, b) => a - b);
          const median = ordered[Math.floor(ordered.length / 2)];
          cadence.refreshFps = clamp(1000 / median, 30, 360);
          cadence.renderStride = Math.max(1, Math.round(cadence.refreshFps / (constrained ? 30 : 75)));
        }
      }
    }
    cadence.lastRafAt = now;
    cadence.rafFrames += 1;
    if (!targetFrameMs && cadence.rafFrames % cadence.renderStride !== 0) return;
    if (targetFrameMs && now - lastFrameAt < targetFrameMs - 0.75) return;
    lastFrameAt = targetFrameMs ? now - modulo(now - lastFrameAt, targetFrameMs) : now;
    draw(now, sceneTime);
  };

  const start = () => {
    if (running || reducedMotion) return;
    running = true;
    lastFrameAt = 0;
    lastSceneFrameAt = 0;
    lastDrawSceneTime = sceneTime;
    cadence.lastRafAt = 0;
    cadence.rafFrames = 0;
    cadence.rafIntervals = [];
    cadence.lastDrawAt = 0;
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
