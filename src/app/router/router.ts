import { getUser } from '../../services/storage/auth-storage';
import renderLoginPage from '../../pages/login/login-page';
import renderStartPage from '../../pages/start/start-page';
import renderGamePage from '../../pages/game/game-page';
import renderToolbar from '../../components/toolbar/toolbar';
import renderStatsPage from '../../pages/stats/stats-page';
import { Routes, type Route } from './routes';

type RouterParams = {
  root: HTMLElement;
};

function normalizeHashRoute(hash: string): Route {
  if (hash === Routes.Start) return Routes.Start;
  if (hash === Routes.Game) return Routes.Game;
  if (hash === Routes.Stats) return Routes.Stats;

  return Routes.Login;
}

export default function startRouter(params: RouterParams): void {
  const { root } = params;

  function renderLoggedInLayout(route: Route): void {
    root.innerHTML = '';

    const toolbar = renderToolbar({
      onLogout: () => {
        window.location.hash = Routes.Login;
      },
    });

    const contentRoot = document.createElement('main');

    root.append(toolbar, contentRoot);

    if (route === Routes.Game) {
      renderGamePage(contentRoot);

      return;
    }

    if (route === Routes.Stats) {
      renderStatsPage(contentRoot);

      return;
    }

    renderStartPage(contentRoot, {
      onStart: () => {
        window.location.hash = Routes.Game;
      },
    });
  }

  function render(): void {
    const user = getUser();
    const route = normalizeHashRoute(window.location.hash);

    if (!user) {
      if (route !== Routes.Login) window.location.hash = Routes.Login;

      renderLoginPage(root, {
        onLoginSuccess: () => {
          window.location.hash = Routes.Start;
        },
      });

      return;
    }

    if (route === Routes.Login) {
      window.location.hash = Routes.Start;

      return;
    }

    renderLoggedInLayout(route);
  }

  window.addEventListener('hashchange', render);

  if (!window.location.hash) window.location.hash = Routes.Login;

  render();
}
