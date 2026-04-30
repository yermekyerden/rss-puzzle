export const Routes = {
  Login: '#/login',
  Start: '#/start',
  Game: '#/game',
  Stats: '#/stats',
} as const;

export type Route = (typeof Routes)[keyof typeof Routes];
