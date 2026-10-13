export const logger = {
  info: (message: string, data?: Record<string, unknown>) => {
    console.log(`[INFO] ${new Date().toISOString()} ${message}`, data ? JSON.stringify(data) : '');
  },
  warn: (message: string, data?: Record<string, unknown>) => {
    console.warn(`[WARN] ${new Date().toISOString()} ${message}`, data ? JSON.stringify(data) : '');
  },
  error: (message: string, error?: unknown) => {
    const errorInfo = error instanceof Error 
      ? { message: error.message, stack: process.env.NODE_ENV === 'development' ? error.stack : undefined }
      : error;
    console.error(`[ERROR] ${new Date().toISOString()} ${message}`, errorInfo ? JSON.stringify(errorInfo) : '');
  },
  debug: (message: string, data?: Record<string, unknown>) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${new Date().toISOString()} ${message}`, data ? JSON.stringify(data) : '');
    }
  },
};
