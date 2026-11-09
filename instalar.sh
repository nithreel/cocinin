#!/usr/bin/env bash
# Instalador de CocinIN para macOS y Linux: deja Git y Node.js 20+ listos, descarga el proyecto y lanza
# `npm run setup`. Se detiene en el único paso manual de Firebase (activar el acceso por correo).
#
#   curl -fsSL https://raw.githubusercontent.com/nithreel/cocinin/main/instalar.sh | bash
#
# Opciones (tras `bash -s --` si se usa con curl):  --simular  muestra lo que haría sin instalar nada.
# Variable: COCININ_DIR = carpeta de destino (por defecto ~/cocinin).
set -euo pipefail

REPO="https://github.com/nithreel/cocinin.git"
DIR="${COCININ_DIR:-$HOME/cocinin}"
SIMULAR=0
[ "${1:-}" = "--simular" ] && SIMULAR=1

say()  { printf '\n\033[1;32m▸ %s\033[0m\n' "$*"; }
info() { printf '  %s\n' "$*"; }
die()  { printf '\n\033[1;31m✖ %s\033[0m\n' "$*" >&2; exit 1; }

# Ejecuta (o, con --simular, solo muestra) un comando
run() {
  if [ "$SIMULAR" = 1 ]; then info "[simulación] $*"; else "$@"; fi
}

# Pregunta de sí/no leyendo del teclado (stdin puede ser la tubería de curl)
confirm() {
  [ "$SIMULAR" = 1 ] && return 0
  [ -r /dev/tty ] || die "No puedo preguntarte nada (no hay terminal). Ejecútalo desde una terminal normal."
  printf '  %s [S/n] ' "$1" > /dev/tty
  read -r ans < /dev/tty
  case "$ans" in [nN]*) return 1 ;; *) return 0 ;; esac
}

# Para probar el script sin tocar el sistema: COCININ_FALTA="git node" finge que faltan.
have() {
  case " ${COCININ_FALTA:-} " in *" $1 "*) return 1 ;; esac
  command -v "$1" > /dev/null 2>&1
}

node_ok() {
  have node || return 1
  [ "$(node -p 'process.versions.node.split(".")[0]')" -ge 20 ]
}

OS="$(uname -s)"
case "$OS" in Darwin | Linux) ;; *) die "Este script es para macOS y Linux. En Windows usa instalar.ps1 (mira el README)." ;; esac
[ "$(id -u)" -eq 0 ] && die "No lo ejecutes como administrador (root): usa tu usuario normal. Pedirá la contraseña solo cuando haga falta."

say "CocinIN: preparando tu ordenador"

# --- Git ---
if have git; then
  info "✔ $(git --version)"
else
  say "Instalando Git"
  if [ "$OS" = Darwin ]; then
    if have brew; then
      confirm "Voy a instalar Git con Homebrew." || die "Instala Git y vuelve a lanzar el script."
      run brew install git
    else
      info "Se abrirá una ventana del sistema para instalar las herramientas de desarrollo (incluyen Git)."
      info "Cuando termine, vuelve a lanzar este mismo comando."
      run xcode-select --install || true
      exit 0
    fi
  else
    confirm "Voy a instalar Git con el gestor de paquetes de tu sistema (pedirá tu contraseña)." || die "Instala Git y vuelve a lanzar el script."
    if have apt-get; then run sudo apt-get update && run sudo apt-get install -y git curl
    elif have dnf; then run sudo dnf install -y git
    elif have pacman; then run sudo pacman -S --needed --noconfirm git
    elif have zypper; then run sudo zypper --non-interactive install git
    else die "No reconozco tu gestor de paquetes. Instala Git a mano y vuelve a lanzar el script."
    fi
  fi
fi

# --- Node.js 20+ (con nvm: sin permisos de administrador y con la versión correcta en cualquier distribución) ---
if node_ok; then
  info "✔ Node.js $(node --version)"
else
  say "Instalando Node.js 22 (LTS)"
  info "Se instala con nvm en tu carpeta personal (~/.nvm); no toca el resto del sistema."
  confirm "¿Continuar?" || die "Instala Node.js 20 o superior y vuelve a lanzar el script."
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  if [ "$SIMULAR" = 1 ]; then
    info "[simulación] curl nvm-sh/nvm install.sh | bash ; nvm install 22"
  else
    if [ ! -s "$NVM_DIR/nvm.sh" ]; then
      curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
    fi
    # shellcheck disable=SC1091
    . "$NVM_DIR/nvm.sh"
    nvm install 22
    nvm use 22 > /dev/null
  fi
fi

# --- Proyecto ---
say "Descargando CocinIN en $DIR"
if [ -d "$DIR/.git" ]; then
  info "Ya existe: lo actualizo."
  run git -C "$DIR" pull --ff-only
else
  [ -e "$DIR" ] && die "$DIR ya existe y no es una copia de CocinIN. Bórralo o elige otra carpeta con COCININ_DIR."
  run git clone "$REPO" "$DIR"
fi
if [ "$SIMULAR" != 1 ]; then cd "$DIR"; fi

say "Instalando dependencias (1-2 minutos)"
run npm install --no-fund --no-audit

say "Asistente de Firebase"
info "Se abrirá el navegador para iniciar sesión con tu cuenta de Google."
if [ "$SIMULAR" = 1 ]; then
  info "[simulación] npm run setup"
else
  # el asistente es interactivo: se le da el teclado aunque este script llegue por una tubería
  npm run setup < /dev/tty
fi
