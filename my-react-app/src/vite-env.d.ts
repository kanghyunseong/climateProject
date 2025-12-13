/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_REPLICATE_API_KEY?: string;
  readonly VITE_REPLICATE_API_URL?: string;
  readonly VITE_REPLICATE_MODEL?: string;
  readonly VITE_REPLICATE_MODEL_VERSION?: string;
  // 다른 환경 변수들...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Vite의 기본 ImportMeta 타입 확장
declare global {
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

export {};

