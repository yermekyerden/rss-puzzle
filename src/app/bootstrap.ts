import startRouter from './router/router';

export default function bootstrapApp(root: HTMLElement): void {
  const appRoot = root;
  startRouter({ root: appRoot });
}
