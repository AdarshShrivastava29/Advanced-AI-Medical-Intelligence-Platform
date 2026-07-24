/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  /** Hospital / health-system name shown in the app chrome (presentation only). */
  readonly VITE_ORG_NAME?: string;
  /** Department or service line shown under the organisation name. */
  readonly VITE_ORG_UNIT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
