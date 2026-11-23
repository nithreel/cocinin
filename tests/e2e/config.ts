/** Constantes compartidas entre el lanzador (run.mjs), la siembra y los tests. */
export const PROJECT_ID = 'demo-cocinin-e2e' // prefijo `demo-`: el emulador nunca habla con un proyecto real
export const AUTH_PORT = 9099 // fijos: la app los lleva escritos (src/firebase.ts)
export const FIRESTORE_PORT = 8089
export const WEB_PORT = Number(process.env.E2E_WEB_PORT ?? 5199)
export const BASE_URL = `http://127.0.0.1:${WEB_PORT}`
export const CHROME_PATH = process.env.CHROME_PATH ?? '/usr/bin/chromium'

export const ADMIN = { email: 'admin@e2e.test', password: 'e2e-pass-123', alias: 'Marta' }
export const MEMBER = { email: 'miembro@e2e.test', password: 'e2e-pass-123', alias: '' }
