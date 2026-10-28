import { useSyncExternalStore } from 'react';

/*
 * App-wide error modal state. Any code (including non-React code like the global error
 * handler) can call `showErrorModal`; the root layout renders the modal.
 */

export type ModalError = {
  title: string;
  message: string;
};

let currentError: ModalError | null = null;
const listeners = new Set<() => void>();

function setCurrentError(error: ModalError | null) {
  currentError = error;
  listeners.forEach((listener) => listener());
}

export const showErrorModal = (error: ModalError) => setCurrentError(error);

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function useErrorModal() {
  const error = useSyncExternalStore(
    subscribe,
    () => currentError,
    () => null,
  );
  return { error, dismiss: () => setCurrentError(null) };
}
