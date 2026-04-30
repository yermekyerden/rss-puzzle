import type { WordCardBackground } from '../../components/word-card/word-card';

export type SentenceWord = {
  id: string;
  text: string;
  background?: WordCardBackground;
};
