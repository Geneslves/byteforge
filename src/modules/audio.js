const AUDIO_KEY = 'byteforge:audio-enabled';
const AUDIO_SRC = '/audio/ink-wash-terminal.mp3';
let audio = null;

const setButtonState = (button, enabled) => {
  button.classList.toggle('is-active', enabled);
  button.setAttribute('aria-pressed', String(enabled));
  button.setAttribute('aria-label', enabled ? '关闭背景音乐' : '开启背景音乐');

  const icon = button.querySelector('.audio-icon');
  if (icon) icon.textContent = enabled ? 'II' : '♪';
};

const ensureAudio = () => {
  if (audio) return audio;

  audio = new Audio(AUDIO_SRC);
  audio.loop = true;
  audio.preload = 'none';
  audio.volume = 0.36;

  return audio;
};

export const initAudioControl = (hub) => {
  const button = hub.querySelector('[data-audio-toggle]');
  if (!button) return;

  const wasPreviouslyEnabled = localStorage.getItem(AUDIO_KEY) === '1';
  let enabled = false;
  if (wasPreviouslyEnabled) button.dataset.audioPreferred = 'true';
  setButtonState(button, enabled);

  const pause = ({ persist = true } = {}) => {
    enabled = false;
    if (audio) audio.pause();
    if (persist) localStorage.setItem(AUDIO_KEY, '0');
    setButtonState(button, false);
  };

  const play = async () => {
    try {
      const player = ensureAudio();
      await player.play();
      enabled = true;
      localStorage.setItem(AUDIO_KEY, '1');
      setButtonState(button, true);
    } catch (error) {
      pause({ persist: false });
      throw error;
    }
  };

  button.addEventListener('click', () => {
    if (enabled) {
      pause();
    } else {
      play().catch(() => {});
    }
  });
};
