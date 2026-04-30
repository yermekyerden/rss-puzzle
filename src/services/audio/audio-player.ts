let currentAudio: HTMLAudioElement | null = null;

export type PlayResult = {
  isPlaying: boolean;
  src: string | null;
};

export function stopAudio(): void {
  if (currentAudio === null) return;

  currentAudio.pause();
  currentAudio.currentTime = 0;
  currentAudio.src = '';
  currentAudio.load();
  currentAudio = null;
}

export async function playAudio(src: string): Promise<void> {
  stopAudio();

  const audio = new Audio(src);
  currentAudio = audio;

  try {
    await audio.play();
  } catch {
    stopAudio();
    throw new Error('Failed to play audio.');
  }

  audio.onended = () => {
    stopAudio();
  };

  audio.onerror = () => {
    stopAudio();
  };
}

export function getCurrentAudioSrc(): string | null {
  return currentAudio?.src ?? null;
}
