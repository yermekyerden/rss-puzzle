import createElement from '../../shared/dom/create-element';
import { loadLastRoundResults } from '../../services/storage/results-storage';
import { Routes } from '../../app/router/routes';
import { getCurrentAudioSrc, playAudio, stopAudio } from '../../services/audio/audio-player';

export default function renderStatsPage(root: HTMLElement): void {
  const container = root;
  container.innerHTML = '';

  const page = createElement('section', { className: 'stats-page' });

  const pageTitle = createElement('h1', { className: 'stats-title', textContent: 'Stats' });
  page.append(pageTitle);

  const results = loadLastRoundResults();

  function rerenderPlayingState(): void {
    const current = getCurrentAudioSrc();

    const buttons = page.querySelectorAll<HTMLButtonElement>('[data-audio-src]');
    buttons.forEach((button) => {
      const src = button.dataset.audioSrc ?? '';
      const isPlaying = current !== null && src !== '' && current === src;

      button.classList.toggle('is-playing', isPlaying);
      button.setAttribute('aria-pressed', String(isPlaying));
    });
  }

  if (results === null) {
    const empty = createElement('p', { className: 'stats-empty', textContent: 'No results yet.' });

    const back = createElement('button', {
      className: 'stats-button',
      textContent: 'Back to game',
    }) as HTMLButtonElement;

    back.type = 'button';
    back.addEventListener('click', () => {
      window.location.hash = Routes.Game;
    });

    page.append(empty, back);
    container.append(page);
    return;
  }

  const header = createElement('p', {
    className: 'stats-header',
    textContent: `Level ${results.level}, Round ${results.roundIndex + 1}`,
  });

  const artworkInfo = createElement('p', {
    className: 'stats-artwork-info',
    textContent: `${results.artwork.author} — ${results.artwork.title} (${results.artwork.year})`,
  });

  const image = createElement('img', {
    className: 'stats-image',
    attributes: {
      src: results.artwork.imageUrl,
      alt: results.artwork.title,
      loading: 'lazy',
    },
  }) as HTMLImageElement;

  const knownSentences = results.sentences.filter((s) => s.outcome === 'known');
  const unknownSentences = results.sentences.filter((s) => s.outcome === 'dontKnow');

  const sections = createElement('div', { className: 'stats-sections' });

  const renderSection = (params: {
    sectionTitle: string;
    emptyText: string;
    sentences: typeof results.sentences;
    kind: 'known' | 'unknown';
  }): HTMLElement => {
    const { sectionTitle, emptyText, sentences, kind } = params;

    const section = createElement('section', { className: 'stats-section' });
    const heading = createElement('h2', {
      className: 'stats-section-title',
      textContent: sectionTitle,
    });

    const list = createElement('div', { className: 'stats-list' });

    if (sentences.length === 0) {
      list.append(createElement('p', { className: 'stats-section-empty', textContent: emptyText }));
      section.append(heading, list);
      return section;
    }

    sentences.forEach((s) => {
      const row = createElement('div', {
        className: kind === 'unknown' ? 'stats-row is-unknown' : 'stats-row',
      });

      const sentenceLine = createElement('div', { className: 'stats-sentence-line' });

      const sentence = createElement('div', {
        className: 'stats-sentence',
        textContent: `${s.sentenceIndex + 1}. ${s.sentence}`,
      });

      const audioButton = createElement('button', {
        className: 'stats-audio',
        textContent: '🔊',
        attributes: {
          type: 'button',
          'aria-label': 'Play pronunciation',
          'aria-pressed': 'false',
          ...(s.audioSrc ? { 'data-audio-src': s.audioSrc } : {}),
        },
      }) as HTMLButtonElement;

      audioButton.disabled = s.audioSrc === null;

      audioButton.addEventListener('click', () => {
        if (s.audioSrc === null) return;

        const current = getCurrentAudioSrc();

        if (current === s.audioSrc) {
          stopAudio();
          rerenderPlayingState();
          return;
        }

        playAudio(s.audioSrc)
          .then(() => {})
          .catch(() => {})
          .finally(() => {
            rerenderPlayingState();
          });

        rerenderPlayingState();
      });

      sentenceLine.append(sentence, audioButton);

      const translation = createElement('div', {
        className: 'stats-translation',
        textContent: s.translation,
      });

      row.append(sentenceLine, translation);
      list.append(row);
    });

    section.append(heading, list);
    return section;
  };

  sections.append(
    renderSection({
      sectionTitle: `Known (${knownSentences.length})`,
      emptyText: 'No known sentences in this round.',
      sentences: knownSentences,
      kind: 'known',
    }),
    renderSection({
      sectionTitle: `I don’t know (${unknownSentences.length})`,
      emptyText: 'No “I don’t know” sentences in this round.',
      sentences: unknownSentences,
      kind: 'unknown',
    }),
  );

  const actions = createElement('div', { className: 'stats-actions' });

  const continueButton = createElement('button', {
    className: 'stats-button',
    textContent: 'Continue',
  }) as HTMLButtonElement;

  continueButton.type = 'button';
  continueButton.addEventListener('click', () => {
    window.location.hash = Routes.Game;
  });

  actions.append(continueButton);

  page.append(header, artworkInfo, image, sections, actions);
  rerenderPlayingState();
  container.append(page);
}
