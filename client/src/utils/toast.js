// Global Lightweight Toast Notification Event Emitter
class ToastManager {
  constructor() {
    this.listeners = new Set();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  show(message, type = "info", duration = 3500) {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    const toast = { id, message, type, duration };
    this.listeners.forEach((listener) => listener(toast));
  }
}

export const toastManager = new ToastManager();

export function showToast(message, type = "info", duration = 3500) {
  toastManager.show(message, type, duration);
}
