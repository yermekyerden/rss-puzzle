import createElement from '../../shared/dom/create-element';
import { clearUser } from '../../services/storage/auth-storage';
import { resetHintSettings } from '../../services/storage/hints-storage';

type ToolbarParams = {
  onLogout: () => void;
};

export default function renderToolbar(params: ToolbarParams): HTMLElement {
  const toolbar = createElement('header');

  const logoutButton = createElement('button', { textContent: 'Logout' });

  logoutButton.type = 'button';
  logoutButton.addEventListener('click', () => {
    clearUser();
    resetHintSettings();
    params.onLogout();
  });

  toolbar.append(logoutButton);

  return toolbar;
}
