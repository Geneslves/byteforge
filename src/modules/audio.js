const AUDIO_KEY = 'byteforge:audio-enabled';
const AUDIO_SRC = '/audio/ink-wash-terminal.mp3';

const setButtonState = (button, enabled) => {
  button.classList.toggle('is-active', enabled);
  button.setAttribute('aria-pressed', String(enabled));
  button.setAttribute('aria-label', enabled ? '关闭背景音乐' : '开启背景音乐');
  const icon = button.querySelector('.audio-icon');
  if (icon) icon.textContent = enabled ? 'II' : '♪';
};

export const initAudioControl = (hub) => {
  const button = hub.querySelector('[data-audio-toggle]');
  if (!button) return;

  const audio = new Audio(AUDIO_SRC);
  audio.loop = true;
  audio.preload = 'auto';
  audio.volume = 0.36;

  let enabled = localStorage.getItem(AUDIO_KEY) === '1';
  setButtonState(button, enabled);

  const pause = () => {
    enabled = false;
    audio.pause();
    localStorage.setItem(AUDIO_KEY, '0');
    setButtonState(button, false);
  };

  const play = async () => {
    try {
      await audio.play();
      enabled = true;
      localStorage.setItem(AUDIO_KEY, '1');
      setButtonState(button, true);
    } catch {
      pause();
    }
  };

  if (enabled) {
    enabled = false;
    setButtonState(button, false);
  }

  button.addEventListener('click', () => {
    if (enabled) {
      pause();
    } else {
      play();
    }
  });
};
