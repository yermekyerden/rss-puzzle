import createElement from '../../shared/dom/create-element';
import shuffle from '../../shared/utils/shuffle';
import createWordCard, {
  type WordCardVariant,
  type WordCardParams,
} from '../../components/word-card/word-card';
import createHintPanel from '../../components/hint-panel/hint-panel';

import type { DragSource } from './dnd/types';
import { BOARD_DATA_ATTR } from './dnd/dom-attrs';
import type { Preview } from './dnd/drag-preview';
import {
  createDragPreview,
  hideDragPreview,
  moveDragPreview,
  showDragPreview,
} from './dnd/drag-preview';
import getDropTargetAtPoint from './dnd/get-drop-target';
import { moveBetweenLists, reorderInList } from './dnd/move-word';

import type { SentenceWord } from './types';
import buildSentenceWords from './sentence-words';

import {
  loadLevel,
  resolveDatasetAssetPath,
  resolveDatasetImagePath,
  type LevelFile,
  type RoundItem,
} from '../../services/api/puzzle-data';
import {
  loadProgressState,
  isRoundCompleted,
  markRoundCompleted,
  getCompletedRoundsForLevel,
  type ProgressState,
} from '../../services/storage/progress-storage';

import { loadHintSettings, saveHintSettings } from '../../services/storage/hints-storage';

import {
  saveLastRoundResults,
  type RoundResults,
  type SentenceOutcome,
} from '../../services/storage/results-storage';

import { Routes } from '../../app/router/routes';

type CheckStatus = 'idle' | 'checkedIncorrect' | 'checkedCorrect';

type GameState = {
  sentenceIndex: number;
  sourceWords: SentenceWord[];
  resultWords: SentenceWord[];
  checkStatus: CheckStatus;
  resultWordVariantsById: Record<string, WordCardVariant>;
};

type DragState = {
  wordId: string;
  fromBoard: DragSource;
  pointerId: number;
  draggedWord: SentenceWord;
  offsetX: number;
  offsetY: number;
};

type DndState = {
  drag: DragState | null;
  ignoreNextClick: boolean;
};

type PointerDownArgs = {
  id: string;
  event: PointerEvent;
  board: DragSource;
};

type SnapAnimationParams = {
  snappedWordId: string | null;
  onSnapped: () => void;
};

const LEVELS_COUNT = 6;

let gameDndAbortController: AbortController | null = null;

function createInitialState(sentenceIndex: number, correctSentence: SentenceWord[]): GameState {
  return {
    sentenceIndex,
    sourceWords: shuffle(correctSentence),
    resultWords: [],
    checkStatus: 'idle',
    resultWordVariantsById: {},
  };
}

function completeSentence(correctSentence: SentenceWord[]): {
  sourceWords: SentenceWord[];
  resultWords: SentenceWord[];
  variantsById: Record<string, WordCardVariant>;
} {
  const sourceWords: SentenceWord[] = [];
  const resultWords = [...correctSentence];
  const variantsById: Record<string, WordCardVariant> = {};

  correctSentence.forEach((word) => {
    variantsById[word.id] = 'correct';
  });

  return { sourceWords, resultWords, variantsById };
}

function isSentenceComplete(state: GameState, correctSentence: SentenceWord[]): boolean {
  return state.resultWords.length === correctSentence.length;
}

function buildVariantsForCheck(
  resultWords: SentenceWord[],
  correctSentence: SentenceWord[],
): Record<string, WordCardVariant> {
  const variants: Record<string, WordCardVariant> = {};

  resultWords.forEach((word, index) => {
    const correctWord = correctSentence[index];

    const isCorrectPosition = correctWord !== undefined && word.id === correctWord.id;
    variants[word.id] = isCorrectPosition ? 'correct' : 'wrong';
  });

  return variants;
}

function isSentenceCorrect(resultWords: SentenceWord[], correctSentence: SentenceWord[]): boolean {
  if (resultWords.length !== correctSentence.length) return false;

  for (let index = 0; index < resultWords.length; index += 1) {
    const resultWord = resultWords[index];
    const correctWord = correctSentence[index];

    if (resultWord === undefined || correctWord === undefined) return false;

    if (resultWord.id !== correctWord.id) return false;
  }

  return true;
}

function renderBoard(
  container: HTMLElement,
  words: SentenceWord[],
  boardKind: DragSource,
  onCardClick: (id: string) => void,
  onCardPointerDown: (args: PointerDownArgs) => void,
  variantsById?: Record<string, WordCardVariant>,
  snap?: SnapAnimationParams,
): void {
  const board = container;
  board.replaceChildren();

  words.forEach((word) => {
    const variant = variantsById?.[word.id] ?? 'neutral';

    const cardParams = {
      id: word.id,
      text: word.text,
      onClick: onCardClick,
      onPointerDown: (id: string, event: PointerEvent) => {
        onCardPointerDown({ id, event, board: boardKind });
      },
      variant,
    } satisfies Omit<WordCardParams, 'background'>;

    const card = createWordCard(
      word.background ? { ...cardParams, background: word.background } : cardParams,
    );

    board.append(card);

    const snappedWordId = snap?.snappedWordId ?? null;

    if (snappedWordId !== null && word.id === snappedWordId && card instanceof HTMLElement) {
      card.animate([{ transform: 'scale(1.06)' }, { transform: 'scale(1)' }], {
        duration: 120,
        easing: 'ease-out',
      });

      snap?.onSnapped();
    }
  });
}

export default function renderGamePage(root: HTMLElement): void {
  const appRoot = root;
  appRoot.innerHTML = '';
  let render: () => void = () => {};

  const title = createElement('h1', { textContent: 'Game page' });
  const progress = createElement('p', { textContent: 'Loading...' });

  const selection = createElement('div', { className: 'game-selection' });

  const levelSelect = createElement('select', {
    className: 'game-selection-select',
  }) as HTMLSelectElement;
  const levelLabel = createElement('label', { className: 'game-selection-label' });
  levelLabel.append(createElement('span', { textContent: 'Level' }), levelSelect);

  const roundSelect = createElement('select', {
    className: 'game-selection-select',
  }) as HTMLSelectElement;
  const roundLabel = createElement('label', { className: 'game-selection-label' });
  roundLabel.append(createElement('span', { textContent: 'Round' }), roundSelect);

  selection.append(levelLabel, roundLabel);

  const layout = createElement('div', { className: 'game-layout' });

  const sourceTitle = createElement('h2', { textContent: 'Source' });
  const sourceBoard = createElement('div', { className: 'word-board' });
  sourceBoard.setAttribute(BOARD_DATA_ATTR, 'source');

  const resultTitle = createElement('h2', { textContent: 'Result' });
  const resultBoard = createElement('div', { className: 'word-board' });
  resultBoard.setAttribute(BOARD_DATA_ATTR, 'result');

  layout.append(sourceTitle, sourceBoard, resultTitle, resultBoard);

  const actions = createElement('div', { className: 'game-actions' });
  const actionButton = createElement('button', { className: 'game-action', textContent: 'Check' });
  const dontKnowButton = createElement('button', {
    className: 'game-action game-action--secondary',
    textContent: "I don't know",
  });

  actions.append(actionButton, dontKnowButton);

  const roundRevealOverlay = createElement('div', {
    className: 'round-reveal round-reveal--hidden',
  });

  const roundRevealDialog = createElement('div', { className: 'round-reveal-dialog' });

  const roundRevealTitle = createElement('h2', {
    className: 'round-reveal-title',
    textContent: 'Artwork revealed',
  });

  const roundRevealInfo = createElement('p', { className: 'round-reveal-info', textContent: '' });

  const roundRevealBoard = createElement('div', { className: 'round-reveal-board' });

  const roundRevealActions = createElement('div', { className: 'round-reveal-actions' });

  const roundRevealResultsButton = createElement('button', {
    className: 'game-action game-action--secondary',
    textContent: 'Results',
  }) as HTMLButtonElement;

  const roundRevealContinueButton = createElement('button', {
    className: 'game-action',
    textContent: 'Continue',
  }) as HTMLButtonElement;

  roundRevealResultsButton.type = 'button';
  roundRevealContinueButton.type = 'button';

  roundRevealActions.append(roundRevealResultsButton, roundRevealContinueButton);
  roundRevealDialog.append(roundRevealTitle, roundRevealInfo, roundRevealBoard, roundRevealActions);
  roundRevealOverlay.append(roundRevealDialog);

  let roundData: RoundItem | null = null;
  let loadError: string | null = null;

  const hintSettings = loadHintSettings();

  let isTranslationHintEnabled = hintSettings.translationEnabled;
  let isPronunciationHintEnabled = hintSettings.pronunciationEnabled;
  let isBackgroundHintEnabled = hintSettings.backgroundEnabled;

  let isPronunciationPlaying = false;
  let currentAudio: HTMLAudioElement | null = null;

  function stopPronunciation(): void {
    if (currentAudio !== null) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio.src = '';
      currentAudio.load();
      currentAudio = null;
    }

    isPronunciationPlaying = false;
  }

  async function playPronunciation(audioUrl: string): Promise<void> {
    stopPronunciation();

    const audio = new Audio(audioUrl);
    currentAudio = audio;

    isPronunciationPlaying = true;
    render();

    audio.onended = () => {
      stopPronunciation();
      render();
    };

    audio.onerror = () => {
      stopPronunciation();
      render();
    };

    try {
      await audio.play();
    } catch (error: unknown) {
      stopPronunciation();
      render();
      throw error;
    }
  }

  // Declared early to satisfy no-use-before-define.
  let getCurrentAudioSrc: () => string | null = () => null;
  let onPronunciationToggle: () => void = () => {};

  const hintPanel = createHintPanel({
    isBackgroundEnabled: isBackgroundHintEnabled,
    onBackgroundToggle: (isEnabled) => {
      isBackgroundHintEnabled = isEnabled;
      saveHintSettings({ backgroundEnabled: isEnabled });
      render();
    },

    isTranslationEnabled: isTranslationHintEnabled,
    onTranslationToggle: (isEnabled) => {
      isTranslationHintEnabled = isEnabled;
      saveHintSettings({ translationEnabled: isEnabled });
      render();
    },

    isPronunciationEnabled: isPronunciationHintEnabled,
    onPronunciationToggle: (isEnabled) => {
      isPronunciationHintEnabled = isEnabled;
      saveHintSettings({ pronunciationEnabled: isEnabled });

      if (!isPronunciationHintEnabled) {
        stopPronunciation();
      }

      render();
    },

    onPronunciationClick: () => {
      onPronunciationToggle();
    },
  });

  appRoot.append(
    title,
    selection,
    progress,
    hintPanel.element,
    layout,
    actions,
    roundRevealOverlay,
  );

  let activeLevel = 1;
  let activeRoundIndex = 0;
  let activeLevelFile: LevelFile | null = null;

  let progressState: ProgressState = loadProgressState();

  const roundsCountByLevel = new Map<number, number>();

  let state: GameState = createInitialState(0, []);
  let lastDroppedWordId: string | null = null;

  const preview: Preview = createDragPreview();
  const dnd: DndState = { drag: null, ignoreNextClick: false };

  let isRoundRevealOpen = false;

  const sentenceOutcomeByIndex = new Map<number, SentenceOutcome>();

  function closeRoundReveal(): void {
    isRoundRevealOpen = false;
    roundRevealOverlay.classList.add('round-reveal--hidden');
    roundRevealOverlay.classList.remove('round-reveal--revealed');
    roundRevealBoard.replaceChildren();
    roundRevealInfo.textContent = '';
  }

  function openRoundReveal(): void {
    if (roundData === null) return;

    isRoundRevealOpen = true;

    stopPronunciation();

    const { author, name, year } = roundData.levelData;
    roundRevealInfo.textContent = `${author} — ${name} (${year})`;

    roundRevealBoard.replaceChildren();

    const sentencesCount = roundData.words.length;

    const imagePath = roundData.levelData.cutSrc || roundData.levelData.imageSrc;
    const imageUrl = resolveDatasetImagePath(imagePath);

    for (let sentenceIndex = 0; sentenceIndex < sentencesCount; sentenceIndex += 1) {
      const item = roundData.words[sentenceIndex];

      if (item !== undefined) {
        const row = createElement('div', { className: 'round-reveal-row' });

        const words = buildSentenceWords(sentenceIndex, item.textExample, {
          imageUrl,
          row: sentenceIndex,
          rows: sentencesCount,
        });

        words.forEach((word) => {
          const card = createWordCard({
            id: word.id,
            text: word.text,
            variant: 'neutral',
            onClick: () => undefined,
            ...(word.background ? { background: word.background } : {}),
          });

          card.tabIndex = -1;
          card.setAttribute('aria-hidden', 'true');

          row.append(card);
        });

        roundRevealBoard.append(row);
      }
    }

    roundRevealOverlay.classList.remove('round-reveal--hidden');

    requestAnimationFrame(() => {
      roundRevealOverlay.classList.add('round-reveal--revealed');
    });
  }

  function buildRoundResults(): RoundResults {
    if (roundData === null) {
      throw new Error('Round data is not loaded.');
    }

    const imagePath = roundData.levelData.cutSrc || roundData.levelData.imageSrc;
    const imageUrl = resolveDatasetImagePath(imagePath);

    return {
      level: activeLevel,
      roundIndex: activeRoundIndex,
      completedAtIso: new Date().toISOString(),
      artwork: {
        author: roundData.levelData.author,
        title: roundData.levelData.name,
        year: roundData.levelData.year,
        imageUrl,
      },
      sentences: roundData.words.map((item, sentenceIndex) => {
        const audioSrc = item.audioExample ? resolveDatasetAssetPath(item.audioExample) : null;

        return {
          sentenceIndex,
          sentence: item.textExample,
          translation: item.textExampleTranslate,
          audioSrc,
          outcome: sentenceOutcomeByIndex.get(sentenceIndex) ?? 'known',
        };
      }),
    };
  }

  function getNextAfterCurrentRound(): { level: number; roundIndex: number } {
    const roundsCount = activeLevelFile?.roundsCount ?? 0;
    const nextRoundIndex = activeRoundIndex + 1;

    if (roundsCount > 0 && nextRoundIndex < roundsCount) {
      return { level: activeLevel, roundIndex: nextRoundIndex };
    }

    const nextLevel = activeLevel < LEVELS_COUNT ? activeLevel + 1 : 1;
    return { level: nextLevel, roundIndex: 0 };
  }

  async function resolveInitialLevelAndRound(): Promise<{ level: number; roundIndex: number }> {
    progressState = loadProgressState();

    const last = progressState.lastCompleted;
    if (last === null) return { level: 1, roundIndex: 0 };

    const levelFile = await loadLevel(last.level);
    roundsCountByLevel.set(last.level, levelFile.roundsCount);

    const nextRoundIndex = last.roundIndex + 1;

    if (nextRoundIndex < levelFile.roundsCount) {
      return { level: last.level, roundIndex: nextRoundIndex };
    }

    const nextLevel = last.level < LEVELS_COUNT ? last.level + 1 : 1;
    return { level: nextLevel, roundIndex: 0 };
  }

  function isLevelCompleted(level: number): boolean {
    const roundsCount = roundsCountByLevel.get(level);
    if (roundsCount === undefined) return false;

    const completed = getCompletedRoundsForLevel(progressState, level);
    return completed.length >= roundsCount;
  }

  function renderLevelOptions(): void {
    levelSelect.replaceChildren();

    for (let level = 1; level <= LEVELS_COUNT; level += 1) {
      const completedMark = isLevelCompleted(level) ? ' ✓' : '';
      const option = createElement('option', {
        textContent: `Level ${level}${completedMark}`,
        attributes: { value: String(level) },
      }) as HTMLOptionElement;

      levelSelect.append(option);
    }

    levelSelect.value = String(activeLevel);
  }

  function renderRoundOptions(roundsCount: number): void {
    roundSelect.replaceChildren();

    for (let index = 0; index < roundsCount; index += 1) {
      const completedMark = isRoundCompleted(progressState, activeLevel, index) ? ' ✓' : '';
      const option = createElement('option', {
        textContent: `Round ${index + 1}${completedMark}`,
        attributes: { value: String(index) },
      }) as HTMLOptionElement;

      roundSelect.append(option);
    }

    roundSelect.value = String(activeRoundIndex);
    roundSelect.disabled = roundsCount <= 0;
  }

  function syncSelectorsFromState(): void {
    renderLevelOptions();

    const roundsCount = activeLevelFile?.roundsCount ?? 0;
    renderRoundOptions(roundsCount);
  }

  function completeRound(): void {
    markRoundCompleted(activeLevel, activeRoundIndex);

    progressState = loadProgressState();
    syncSelectorsFromState();

    saveLastRoundResults(buildRoundResults());
  }

  function prefetchLevelsMeta(): void {
    for (let level = 1; level <= LEVELS_COUNT; level += 1) {
      loadLevel(level)
        .then((file) => {
          roundsCountByLevel.set(level, file.roundsCount);
          renderLevelOptions();
        })
        .catch(() => {});
    }
  }

  function getSentenceData(sentenceIndex: number): {
    correctWords: SentenceWord[];
    translation: string;
    audioSrc: string | null;
    hasSentence: boolean;
  } {
    if (roundData === null)
      return { correctWords: [], translation: '', audioSrc: null, hasSentence: false };

    const item = roundData.words[sentenceIndex];
    if (item === undefined)
      return { correctWords: [], translation: '', audioSrc: null, hasSentence: false };

    const imagePath = roundData.levelData.cutSrc || roundData.levelData.imageSrc;
    const imageUrl = resolveDatasetImagePath(imagePath);

    const correctWords = buildSentenceWords(sentenceIndex, item.textExample, {
      imageUrl,
      row: sentenceIndex,
      rows: roundData.words.length,
    });

    const audioSrc = item.audioExample ? resolveDatasetAssetPath(item.audioExample) : null;

    return {
      correctWords,
      translation: item.textExampleTranslate,
      audioSrc,
      hasSentence: true,
    };
  }

  getCurrentAudioSrc = (): string | null => {
    if (roundData === null) return null;

    const sentence = getSentenceData(state.sentenceIndex);
    if (!sentence.hasSentence) return null;

    return sentence.audioSrc;
  };

  onPronunciationToggle = (): void => {
    const audioSrc = getCurrentAudioSrc();
    if (audioSrc === null) return;

    if (isPronunciationPlaying) {
      stopPronunciation();
      render();
      return;
    }

    playPronunciation(audioSrc).catch(() => {});
  };

  function findWord(board: DragSource, id: string): SentenceWord | null {
    const list = board === 'source' ? state.sourceWords : state.resultWords;
    return list.find((word) => word.id === id) ?? null;
  }

  function startDrag(args: PointerDownArgs): void {
    if (isRoundRevealOpen) return;

    const { id, event, board } = args;

    const word = findWord(board, id);
    if (word === null) return;

    const { pointerId, clientX, clientY, currentTarget } = event;

    if (currentTarget instanceof HTMLElement) {
      currentTarget.setPointerCapture(pointerId);
    }

    dnd.drag = {
      wordId: id,
      fromBoard: board,
      pointerId,
      draggedWord: word,
      offsetX: 12,
      offsetY: 12,
    };

    dnd.ignoreNextClick = true;

    showDragPreview(preview, word.text, clientX + 12, clientY + 12);

    document.body.classList.add('is-dragging');
  }

  function cleanupDragUi(): void {
    document.body.classList.remove('is-dragging');
    sourceBoard.classList.remove('is-drop-target');
    resultBoard.classList.remove('is-drop-target');
  }

  async function loadAndStartRound(level: number, roundIndex: number): Promise<void> {
    closeRoundReveal();
    sentenceOutcomeByIndex.clear();

    loadError = null;
    roundData = null;
    activeLevelFile = null;

    progress.textContent = 'Loading...';
    hintPanel.setTranslation({ text: '', isVisible: false });
    stopPronunciation();
    hintPanel.setPronunciation({ isVisible: false, isDisabled: true, isPlaying: false });
    actionButton.disabled = true;
    dontKnowButton.disabled = true;

    levelSelect.disabled = true;
    roundSelect.disabled = true;

    renderBoard(sourceBoard, [], 'source', () => undefined, startDrag);
    renderBoard(resultBoard, [], 'result', () => undefined, startDrag);

    try {
      const levelFile = await loadLevel(level);
      activeLevelFile = levelFile;
      roundsCountByLevel.set(level, levelFile.roundsCount);

      const safeRoundIndex = Math.max(0, Math.min(roundIndex, levelFile.roundsCount - 1));
      const round = levelFile.rounds[safeRoundIndex];

      if (round === undefined) {
        throw new Error(`Round ${safeRoundIndex} not found in level ${level}.`);
      }

      activeLevel = level;
      activeRoundIndex = safeRoundIndex;

      syncSelectorsFromState();

      roundData = round;

      const sentence0 = getSentenceData(0);
      state = createInitialState(0, sentence0.correctWords);
    } catch (error: unknown) {
      loadError = error instanceof Error ? error.message : String(error);
    } finally {
      levelSelect.disabled = false;
      roundSelect.disabled = false;
    }

    render();
  }

  levelSelect.addEventListener('change', () => {
    const nextLevel = Number(levelSelect.value);
    if (!Number.isFinite(nextLevel)) return;

    stopPronunciation();

    activeLevel = nextLevel;
    activeRoundIndex = 0;

    loadAndStartRound(activeLevel, activeRoundIndex);
  });

  roundSelect.addEventListener('change', () => {
    const nextRoundIndex = Number(roundSelect.value);
    if (!Number.isFinite(nextRoundIndex)) return;

    stopPronunciation();

    activeRoundIndex = nextRoundIndex;

    loadAndStartRound(activeLevel, activeRoundIndex);
  });

  roundRevealContinueButton.addEventListener('click', () => {
    const next = getNextAfterCurrentRound();
    closeRoundReveal();
    loadAndStartRound(next.level, next.roundIndex);
  });

  roundRevealResultsButton.addEventListener('click', () => {
    if (roundData !== null) {
      saveLastRoundResults(buildRoundResults());
    }

    window.location.hash = Routes.Stats;
  });

  render = (): void => {
    if (loadError !== null) {
      progress.textContent = `Failed to load: ${loadError}`;
      hintPanel.setTranslation({ text: '', isVisible: false });
      hintPanel.setPronunciation({ isVisible: false, isDisabled: true, isPlaying: false });
      actionButton.disabled = true;
      dontKnowButton.disabled = true;
      actions.style.display = 'flex';

      return;
    }

    if (roundData === null) {
      progress.textContent = 'Loading...';
      hintPanel.setTranslation({ text: '', isVisible: false });
      hintPanel.setPronunciation({ isVisible: false, isDisabled: true, isPlaying: false });
      actionButton.disabled = true;
      dontKnowButton.disabled = true;
      actions.style.display = 'flex';

      return;
    }

    if (isRoundRevealOpen) {
      actions.style.display = 'none';
      levelSelect.disabled = true;
      roundSelect.disabled = true;
    } else {
      actions.style.display = 'flex';
    }

    const sentence = getSentenceData(state.sentenceIndex);
    const correctSentence = sentence.correctWords;

    progress.textContent = `Sentence ${state.sentenceIndex + 1}`;

    const sentenceIsComplete = isSentenceComplete(state, correctSentence);
    const sentenceIsCorrect = state.checkStatus === 'checkedCorrect';

    const shouldShowBackground = isBackgroundHintEnabled || sentenceIsCorrect;

    const applyBackgroundVisibility = (words: SentenceWord[]): SentenceWord[] => {
      if (shouldShowBackground) return words;

      return words.map(({ id, text }) => ({ id, text }));
    };

    const sourceWordsForRender = applyBackgroundVisibility(state.sourceWords);
    const resultWordsForRender = applyBackgroundVisibility(state.resultWords);

    const shouldShowTranslation = isTranslationHintEnabled || sentenceIsCorrect;

    hintPanel.setTranslation({ text: sentence.translation, isVisible: shouldShowTranslation });

    const shouldShowPronunciation = isPronunciationHintEnabled || sentenceIsCorrect;

    if (!shouldShowPronunciation) {
      stopPronunciation();
    }

    hintPanel.setPronunciation({
      isVisible: shouldShowPronunciation,
      isDisabled: sentence.audioSrc === null,
      isPlaying: isPronunciationPlaying,
    });

    actionButton.textContent = sentenceIsCorrect ? 'Continue' : 'Check';
    actionButton.disabled = sentenceIsCorrect ? false : !sentenceIsComplete;

    dontKnowButton.disabled = sentenceIsCorrect;

    renderBoard(
      sourceBoard,
      sourceWordsForRender,
      'source',
      (id) => {
        if (dnd.ignoreNextClick) return;

        const moved = moveBetweenLists(state.sourceWords, state.resultWords, id);

        state = {
          ...state,
          sourceWords: moved.nextFrom,
          resultWords: moved.nextTo,
          checkStatus: 'idle',
          resultWordVariantsById: {},
        };

        render();
      },
      startDrag,
      undefined,
      {
        snappedWordId: lastDroppedWordId,
        onSnapped: () => {
          lastDroppedWordId = null;
        },
      },
    );

    renderBoard(
      resultBoard,
      resultWordsForRender,
      'result',
      (id) => {
        if (dnd.ignoreNextClick) return;

        const moved = moveBetweenLists(state.resultWords, state.sourceWords, id);

        state = {
          ...state,
          sourceWords: moved.nextTo,
          resultWords: moved.nextFrom,
          checkStatus: 'idle',
          resultWordVariantsById: {},
        };

        render();
      },
      startDrag,
      state.resultWordVariantsById,
      {
        snappedWordId: lastDroppedWordId,
        onSnapped: () => {
          lastDroppedWordId = null;
        },
      },
    );
  };

  gameDndAbortController?.abort();
  gameDndAbortController = new AbortController();

  window.addEventListener(
    'pointermove',
    (event) => {
      if (isRoundRevealOpen) return;

      const { drag } = dnd;

      if (drag === null) {
        sourceBoard.classList.remove('is-drop-target');
        resultBoard.classList.remove('is-drop-target');
        return;
      }

      if (event.pointerId !== drag.pointerId) return;

      moveDragPreview(preview, event.clientX + drag.offsetX, event.clientY + drag.offsetY);

      const element = document.elementFromPoint(event.clientX, event.clientY);
      const boardElement = element?.closest<HTMLElement>(`[${BOARD_DATA_ATTR}]`) ?? null;

      sourceBoard.classList.toggle('is-drop-target', boardElement === sourceBoard);
      resultBoard.classList.toggle('is-drop-target', boardElement === resultBoard);
    },
    { signal: gameDndAbortController.signal },
  );

  window.addEventListener(
    'pointerup',
    (event) => {
      if (isRoundRevealOpen) return;

      const { drag } = dnd;

      if (drag === null) {
        cleanupDragUi();
        return;
      }

      if (event.pointerId !== drag.pointerId) return;

      hideDragPreview(preview);
      cleanupDragUi();

      const draggedId = drag.wordId;
      const dropTarget = getDropTargetAtPoint(event.clientX, event.clientY);

      if (dropTarget === null) {
        dnd.drag = null;

        setTimeout(() => {
          dnd.ignoreNextClick = false;
        }, 0);

        return;
      }

      const { to, beforeWordId } = dropTarget;

      if (drag.fromBoard === 'source' && to === 'result') {
        const moved = moveBetweenLists(
          state.sourceWords,
          state.resultWords,
          draggedId,
          beforeWordId,
        );

        state = {
          ...state,
          sourceWords: moved.nextFrom,
          resultWords: moved.nextTo,
          checkStatus: 'idle',
          resultWordVariantsById: {},
        };

        lastDroppedWordId = draggedId;
      } else if (drag.fromBoard === 'result' && to === 'source') {
        const moved = moveBetweenLists(
          state.resultWords,
          state.sourceWords,
          draggedId,
          beforeWordId,
        );

        state = {
          ...state,
          sourceWords: moved.nextTo,
          resultWords: moved.nextFrom,
          checkStatus: 'idle',
          resultWordVariantsById: {},
        };

        lastDroppedWordId = draggedId;
      } else if (drag.fromBoard === 'result' && to === 'result') {
        const nextResult = reorderInList(state.resultWords, draggedId, beforeWordId);

        state = {
          ...state,
          resultWords: nextResult,
          checkStatus: 'idle',
          resultWordVariantsById: {},
        };

        lastDroppedWordId = draggedId;
      }

      dnd.drag = null;

      setTimeout(() => {
        dnd.ignoreNextClick = false;
      }, 0);

      render();
    },
    { signal: gameDndAbortController.signal },
  );

  actionButton.addEventListener('click', () => {
    if (roundData === null) return;

    const sentence = getSentenceData(state.sentenceIndex);
    const correctSentence = sentence.correctWords;

    if (state.checkStatus === 'checkedCorrect') {
      stopPronunciation();

      const nextSentenceIndex = state.sentenceIndex + 1;
      const hasNextSentence = nextSentenceIndex < roundData.words.length;

      if (hasNextSentence) {
        const nextSentence = getSentenceData(nextSentenceIndex);
        state = createInitialState(nextSentenceIndex, nextSentence.correctWords);

        render();
        return;
      }

      completeRound();
      openRoundReveal();

      render();
      return;
    }

    if (!isSentenceComplete(state, correctSentence)) return;

    const variants = buildVariantsForCheck(state.resultWords, correctSentence);
    const correct = isSentenceCorrect(state.resultWords, correctSentence);

    if (correct && sentenceOutcomeByIndex.get(state.sentenceIndex) !== 'dontKnow') {
      sentenceOutcomeByIndex.set(state.sentenceIndex, 'known');
    }

    state = {
      ...state,
      checkStatus: correct ? 'checkedCorrect' : 'checkedIncorrect',
      resultWordVariantsById: variants,
    };

    render();
  });

  dontKnowButton.addEventListener('click', () => {
    if (roundData === null) return;

    sentenceOutcomeByIndex.set(state.sentenceIndex, 'dontKnow');

    const sentence = getSentenceData(state.sentenceIndex);
    const correctSentence = sentence.correctWords;

    const completed = completeSentence(correctSentence);

    state = {
      ...state,
      sourceWords: completed.sourceWords,
      resultWords: completed.resultWords,
      checkStatus: 'checkedCorrect',
      resultWordVariantsById: completed.variantsById,
    };

    render();
  });

  render();
  prefetchLevelsMeta();

  resolveInitialLevelAndRound()
    .then(({ level, roundIndex }) => {
      activeLevel = level;
      activeRoundIndex = roundIndex;

      renderLevelOptions();
      loadAndStartRound(activeLevel, activeRoundIndex);
    })
    .catch(() => {
      renderLevelOptions();
      loadAndStartRound(activeLevel, activeRoundIndex);
    });
}
