/// <reference types="vite/client" />
declare module '*.css';
declare module '*.svg';
declare module '*.png';
declare module '*.jpg';

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_API_URL?: string;
  readonly VITE_APP_NAME?: string;
  readonly DEV: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
