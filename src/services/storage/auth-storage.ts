const StorageKeyFirstName = 'rssPuzzle:firstName';
const StorageKeySurname = 'rssPuzzle:surname';

export type StoredUser = {
  firstName: string;
  surname: string;
};

export function setUser(user: StoredUser): void {
  localStorage.setItem(StorageKeyFirstName, user.firstName);
  localStorage.setItem(StorageKeySurname, user.surname);
}

export function getUser(): StoredUser | null {
  const firstName = localStorage.getItem(StorageKeyFirstName);
  const surname = localStorage.getItem(StorageKeySurname);

  if (!firstName || !surname) return null;

  return { firstName, surname };
}

export function clearUser(): void {
  localStorage.removeItem(StorageKeyFirstName);
  localStorage.removeItem(StorageKeySurname);
}
