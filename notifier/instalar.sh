#!/usr/bin/env bash
# Instala (o actualiza) el servicio de avisos push.
#   ./instalar.sh                 en esta misma máquina (necesita Docker)
#   ./instalar.sh usuario@host    en otra máquina por ssh (p. ej. una Raspberry Pi con Docker)
# Es repetible: no pisa claves ni configuración que ya existan.
set -euo pipefail
cd "$(dirname "$0")"
REMOTE="${1:-}"
REMOTE_DIR="cocinin-notifier"
ENV_FILE="../.env"

fallo() { echo "✗ $*" >&2; exit 1; }
env_val() { grep -E "^$1=" "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2- || true; }

[ -f "$ENV_FILE" ] || fallo "No existe .env en la raíz del proyecto (copia .env.example y rellénalo)."
command -v node >/dev/null || fallo "Falta Node (se usa para generar las claves)."
if [ -z "$REMOTE" ]; then
  command -v docker >/dev/null || fallo "Falta Docker en esta máquina."
else
  command -v rsync >/dev/null && command -v ssh >/dev/null || fallo "Para instalar por ssh hacen falta ssh y rsync."
fi

mkdir -p secrets data
chmod 700 secrets

# 1. Claves VAPID (identifican a tu servicio ante los servidores de push)
if [ ! -f secrets/vapid.json ]; then
  npx --yes web-push generate-vapid-keys --json > secrets/vapid.json
  chmod 600 secrets/vapid.json
  echo "✓ Claves VAPID creadas en notifier/secrets/vapid.json"
fi
PUBLIC_KEY=$(node -p "JSON.parse(require('fs').readFileSync('secrets/vapid.json','utf8')).publicKey")

# 2. La clave pública debe estar en .env para que la app la use (hay que volver a desplegar la app)
if [ "$(env_val VITE_VAPID_PUBLIC_KEY)" != "$PUBLIC_KEY" ]; then
  if grep -q "^VITE_VAPID_PUBLIC_KEY=" "$ENV_FILE"; then
    sed -i "s|^VITE_VAPID_PUBLIC_KEY=.*|VITE_VAPID_PUBLIC_KEY=$PUBLIC_KEY|" "$ENV_FILE"
  else
    printf '\nVITE_VAPID_PUBLIC_KEY=%s\n' "$PUBLIC_KEY" >> "$ENV_FILE"
  fi
  echo "✓ Clave pública escrita en .env → ejecuta «npm run deploy» en la raíz para que la app la incluya."
fi

# 3. Clave de la cuenta de servicio (la descargas tú de la consola de Firebase)
if [ ! -f secrets/service-account.json ]; then
  fallo "Falta notifier/secrets/service-account.json.
  Consola de Firebase → Configuración del proyecto → Cuentas de servicio → «Generar nueva clave privada».
  Guarda el fichero con ese nombre y vuelve a ejecutar este script."
fi
chmod 600 secrets/service-account.json
PROJECT=$(node -p "JSON.parse(require('fs').readFileSync('secrets/service-account.json','utf8')).project_id")
[ "$PROJECT" = "$(env_val VITE_FIREBASE_PROJECT_ID)" ] || fallo "La cuenta de servicio es del proyecto «$PROJECT», no del de .env."

# 4. Contacto que se envía a los servidores de push: la URL de tu app (no hace falta dar un correo)
if [ ! -f .env ]; then
  printf 'VAPID_SUBJECT=https://%s\n' "$(env_val VITE_FIREBASE_AUTH_DOMAIN)" > .env
  echo "✓ notifier/.env creado"
fi

# 5. Arrancar
if [ -z "$REMOTE" ]; then
  docker compose up -d --build
else
  ssh "$REMOTE" "mkdir -p $REMOTE_DIR/secrets $REMOTE_DIR/data && chmod 700 $REMOTE_DIR/secrets"
  rsync -a --exclude node_modules --exclude secrets --exclude data ./ "$REMOTE:$REMOTE_DIR/"
  scp -q secrets/vapid.json secrets/service-account.json "$REMOTE:$REMOTE_DIR/secrets/"
  ssh "$REMOTE" "chmod 600 $REMOTE_DIR/secrets/*.json && cd $REMOTE_DIR && docker compose up -d --build"
fi
echo "✓ Servicio en marcha. Para ver el registro: docker logs -f cocinin-notifier"
