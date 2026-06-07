type LogEntry = {
  id: string;
  timestamp: string;
  method: string;
  url: string;
  status: number | string;
  error?: string;
  duration: number;
};

class ApiLogger {
  logs: LogEntry[] = [];
  listeners: Array<() => void> = [];

  addLog(log: Omit<LogEntry, 'id'>) {
    this.logs.unshift({ ...log, id: crypto.randomUUID() });
    if (this.logs.length > 100) this.logs.pop();
    this.notify();
  }

  subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach(l => l());
  }
}

export const apiLogger = new ApiLogger();

export const monkeyPatchFetch = () => {
  if (window.__fetchMonkeyPatched) return;
  const originalFetch = window.fetch;
  Object.defineProperty(window, 'fetch', {
    configurable: true,
    enumerable: true,
    writable: true,
    value: async (...args: any[]) => {
      const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;
      
      // only log our api
      if (url && typeof url === 'string' && !url.includes('/api/')) return originalFetch(args[0], args[1]);
      
      const requestInit = args[1] as RequestInit;
      const method = requestInit?.method || ((args[0] as Request).method) || 'GET';
      const start = performance.now();
      try {
        const response = await originalFetch(args[0], args[1]);
        const duration = Math.round(performance.now() - start);
        apiLogger.addLog({
          timestamp: new Date().toISOString(),
          method,
          url,
          status: response.status,
          duration
        });
        return response;
      } catch (e: any) {
        const duration = Math.round(performance.now() - start);
        apiLogger.addLog({
          timestamp: new Date().toISOString(),
          method,
          url,
          status: 'Error',
          error: e.message || 'Network error',
          duration
        });
        throw e;
      }
    }
  });
  window.__fetchMonkeyPatched = true;
};

declare global {
  interface Window {
    __fetchMonkeyPatched?: boolean;
  }
}
