export default function shuffle<T>(items: readonly T[]): T[] {
  const result = [...items];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));

    const left = result[index];
    const right = result[randomIndex];

    if (left !== undefined && right !== undefined) {
      result[index] = right;
      result[randomIndex] = left;
    }
  }

  return result;
}
