import createElement from '../../shared/dom/create-element';
import { getUser } from '../../services/storage/auth-storage';

type StartPageParams = {
  onStart: () => void;
};

export default function renderStartPage(root: HTMLElement, params: StartPageParams): void {
  const appRoot = root;
  appRoot.innerHTML = '';

  const user = getUser();

  const title = createElement('h1', { textContent: 'RSS Puzzle' });

  const description = createElement('p', {
    textContent: 'Build English sentences from shuffled words and reveal artwork puzzles.',
  });

  const greeting = createElement('p', {
    textContent: user ? `Welcome, ${user.firstName} ${user.surname}!` : 'Welcome!',
  });

  const startButton = createElement('button', { textContent: 'Start' });
  startButton.type = 'button';
  startButton.addEventListener('click', params.onStart);

  appRoot.append(title, description, greeting, startButton);
}
