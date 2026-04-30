import type { SentenceWord } from './types';

type BuildSentenceWordsBackground = {
  imageUrl: string;
  row: number;
  rows: number;
};

export default function buildSentenceWords(
  sentenceIndex: number,
  sentenceText: string,
  background?: BuildSentenceWordsBackground,
): SentenceWord[] {
  const tokens = sentenceText.split(' ').filter((token) => token.length > 0);
  const columns = tokens.length;

  return tokens.map((token, index) => {
    const id = `s${sentenceIndex}w${index}`;

    const word: SentenceWord = {
      id,
      text: token,
    };

    if (background !== undefined) {
      word.background = {
        imageUrl: background.imageUrl,
        columns,
        rows: background.rows,
        col: index,
        row: background.row,
      };
    }

    return word;
  });
}
