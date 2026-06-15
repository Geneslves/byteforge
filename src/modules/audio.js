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

  // 默认启用音频，除非用户之前明确关闭过
  let enabled = localStorage.getItem(AUDIO_KEY) !== '0';
  setButtonState(button, enabled);

  const pause = ({ persist = true } = {}) => {
    enabled = false;
    audio.pause();
    if (persist) localStorage.setItem(AUDIO_KEY, '0');
    setButtonState(button, false);
  };

  const play = async () => {
    try {
      await audio.play();
      enabled = true;
      localStorage.setItem(AUDIO_KEY, '1');
      setButtonState(button, true);
    } catch {
      pause({ persist: false });
    }
  };

  // 自动播放：在页面加载后立即尝试
  if (enabled) {
    // 尝试立即播放
    play().catch(() => {
      // 如果浏览器阻止自动播放，监听用户的第一次交互
      const autoplayOnInteraction = () => {
        play();
        document.removeEventListener('click', autoplayOnInteraction);
        document.removeEventListener('keydown', autoplayOnInteraction);
        document.removeEventListener('touchstart', autoplayOnInteraction);
      };

      document.addEventListener('click', autoplayOnInteraction, { once: true });
      document.addEventListener('keydown', autoplayOnInteraction, { once: true });
      document.addEventListener('touchstart', autoplayOnInteraction, { once: true });
    });
  }

  button.addEventListener('click', () => {
    if (enabled) {
      pause();
    } else {
      play();
    }
  });
};
