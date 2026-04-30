import createElement from '../../shared/dom/create-element';

export type HintPanelApi = {
  element: HTMLElement;

  setBackgroundEnabled: (isEnabled: boolean) => void;

  setTranslation: (params: { text: string; isVisible: boolean }) => void;
  setTranslationEnabled: (isEnabled: boolean) => void;

  setPronunciation: (params: {
    isVisible: boolean;
    isDisabled: boolean;
    isPlaying: boolean;
  }) => void;
  setPronunciationEnabled: (isEnabled: boolean) => void;
};

type CreateHintPanelParams = {
  isBackgroundEnabled: boolean;
  onBackgroundToggle: (isEnabled: boolean) => void;

  isTranslationEnabled: boolean;
  onTranslationToggle: (isEnabled: boolean) => void;

  isPronunciationEnabled: boolean;
  onPronunciationToggle: (isEnabled: boolean) => void;

  onPronunciationClick: () => void;
};

export default function createHintPanel(params: CreateHintPanelParams): HintPanelApi {
  const panel = createElement('section', { className: 'hint-panel' });

  const header = createElement('div', { className: 'hint-panel-header' });

  const toggles = createElement('div', { className: 'hint-panel-toggles' });

  // Background toggle
  const backgroundToggleLabel = createElement('label', { className: 'hint-panel-toggle' });
  const backgroundToggle = createElement('input', {
    attributes: {
      type: 'checkbox',
    },
  }) as HTMLInputElement;

  backgroundToggle.checked = params.isBackgroundEnabled;

  const backgroundToggleText = createElement('span', { textContent: 'Image' });

  backgroundToggleLabel.append(backgroundToggle, backgroundToggleText);

  backgroundToggle.addEventListener('change', () => {
    params.onBackgroundToggle(backgroundToggle.checked);
  });

  // Translation toggle
  const translationToggleLabel = createElement('label', { className: 'hint-panel-toggle' });
  const translationToggle = createElement('input', {
    attributes: { type: 'checkbox' },
  }) as HTMLInputElement;

  translationToggle.checked = params.isTranslationEnabled;

  const translationToggleText = createElement('span', { textContent: 'Translation' });
  translationToggleLabel.append(translationToggle, translationToggleText);

  // Pronunciation toggle
  const pronunciationToggleLabel = createElement('label', { className: 'hint-panel-toggle' });
  const pronunciationToggle = createElement('input', {
    attributes: { type: 'checkbox' },
  }) as HTMLInputElement;

  pronunciationToggle.checked = params.isPronunciationEnabled;

  const pronunciationToggleText = createElement('span', { textContent: 'Pronunciation' });
  pronunciationToggleLabel.append(pronunciationToggle, pronunciationToggleText);

  toggles.append(backgroundToggleLabel, translationToggleLabel, pronunciationToggleLabel);

  // Pronunciation button
  const pronunciationButton = createElement('button', {
    className: 'hint-panel-audio',
    textContent: '🔊',
  }) as HTMLButtonElement;

  pronunciationButton.type = 'button';
  pronunciationButton.setAttribute('aria-label', 'Play pronunciation');

  pronunciationButton.addEventListener('click', () => {
    params.onPronunciationClick();
  });

  header.append(toggles, pronunciationButton);

  const translation = createElement('div', { className: 'hint-panel-translation' });

  panel.append(header, translation);

  translationToggle.addEventListener('change', () => {
    params.onTranslationToggle(translationToggle.checked);
  });

  pronunciationToggle.addEventListener('change', () => {
    params.onPronunciationToggle(pronunciationToggle.checked);
  });

  function setBackgroundEnabled(isEnabled: boolean): void {
    backgroundToggle.checked = isEnabled;
  }

  function setTranslationEnabled(isEnabled: boolean): void {
    translationToggle.checked = isEnabled;
  }

  function setPronunciationEnabled(isEnabled: boolean): void {
    pronunciationToggle.checked = isEnabled;

    if (!isEnabled) {
      pronunciationButton.classList.remove('is-playing');
    }
  }

  function setTranslation(args: { text: string; isVisible: boolean }): void {
    translation.textContent = args.isVisible ? args.text : '';
    translation.classList.toggle('hint-panel-translation--hidden', !args.isVisible);
  }

  function setPronunciation(args: {
    isVisible: boolean;
    isDisabled: boolean;
    isPlaying: boolean;
  }): void {
    pronunciationButton.disabled = args.isDisabled;
    pronunciationButton.classList.toggle('is-playing', args.isPlaying);

    pronunciationButton.style.display = args.isVisible ? '' : 'none';

    if (!args.isVisible) {
      pronunciationButton.classList.remove('is-playing');
    }
  }

  return {
    element: panel,
    setBackgroundEnabled,
    setTranslation,
    setTranslationEnabled,
    setPronunciation,
    setPronunciationEnabled,
  };
}
