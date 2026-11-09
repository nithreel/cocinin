/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

/** versión de esta instalación (package.json) */
declare const __APP_VERSION__: string

interface ImportMetaEnv {
  /** «true» para no consultar GitHub por versiones nuevas */
  readonly VITE_DISABLE_UPDATE_CHECK?: string
  /** repositorio donde buscar releases (por defecto nithreel/cocinin) */
  readonly VITE_FIREBASE_API_KEY: string
  readonly VITE_FIREBASE_AUTH_DOMAIN: string
  readonly VITE_FIREBASE_PROJECT_ID: string
  readonly VITE_FIREBASE_STORAGE_BUCKET: string
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string
  readonly VITE_FIREBASE_APP_ID: string
  readonly VITE_UPDATE_REPO?: string
  readonly VITE_USE_EMULATORS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
