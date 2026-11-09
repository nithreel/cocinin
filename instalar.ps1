# Instalador de CocinIN para Windows: deja Git y Node.js 20+ listos, descarga el proyecto y lanza
# `npm run setup`. Se detiene en el único paso manual de Firebase (activar el acceso por correo).
#
#   irm https://raw.githubusercontent.com/nithreel/cocinin/main/instalar.ps1 | iex
#
# Variable: $env:COCININ_DIR = carpeta de destino (por defecto %USERPROFILE%\cocinin).
$ErrorActionPreference = 'Stop'

$Repo = 'https://github.com/nithreel/cocinin.git'
$Dir = if ($env:COCININ_DIR) { $env:COCININ_DIR } else { Join-Path $env:USERPROFILE 'cocinin' }

function Say($m) { Write-Host "`n> $m" -ForegroundColor Green }
function Info($m) { Write-Host "  $m" }
# throw (y no exit): con `irm | iex`, exit cerraría la ventana de PowerShell antes de poder leer el error.
function Die($m) { Write-Host "`nX $m" -ForegroundColor Red; throw 'Instalación detenida.' }
function Have($c) { [bool](Get-Command $c -ErrorAction SilentlyContinue) }

# Tras instalar con winget, esta ventana aún no ve los programas nuevos: se recarga el PATH.
function Update-Path {
  $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
}

function Test-Node {
  if (-not (Have 'node')) { return $false }
  return ([int](node -p 'process.versions.node.split(".")[0]')) -ge 20
}

function Install-WithWinget($id, $nombre) {
  if (-not (Have 'winget')) {
    Die "No encuentro winget. Instala $nombre a mano (Node.js: https://nodejs.org · Git: https://git-scm.com), cierra esta ventana, ábrela de nuevo y repite el comando."
  }
  winget install -e --id $id --accept-package-agreements --accept-source-agreements
  Update-Path
}

Say 'CocinIN: preparando tu ordenador'

if (Have 'git') { Info "OK $(git --version)" }
else {
  Say 'Instalando Git'
  Install-WithWinget 'Git.Git' 'Git'
  if (-not (Have 'git')) { Die 'Git se instaló, pero esta ventana no lo encuentra. Cierra la ventana, ábrela de nuevo y repite el comando.' }
}

if (Test-Node) { Info "OK Node.js $(node --version)" }
else {
  Say 'Instalando Node.js (LTS)'
  Install-WithWinget 'OpenJS.NodeJS.LTS' 'Node.js'
  if (-not (Test-Node)) { Die 'Node.js se instaló, pero esta ventana no lo encuentra. Cierra la ventana, ábrela de nuevo y repite el comando.' }
}

Say "Descargando CocinIN en $Dir"
if (Test-Path (Join-Path $Dir '.git')) {
  Info 'Ya existe: lo actualizo.'
  git -C $Dir pull --ff-only
  if ($LASTEXITCODE -ne 0) { Die 'No se pudo actualizar la carpeta existente.' }
}
else {
  if (Test-Path $Dir) { Die "$Dir ya existe y no es una copia de CocinIN. Bórrala o elige otra carpeta con `$env:COCININ_DIR." }
  git clone $Repo $Dir
  if ($LASTEXITCODE -ne 0) { Die 'No se pudo descargar CocinIN. Comprueba tu conexión.' }
}
Set-Location $Dir

# Se usa npm.cmd: el npm.ps1 normal lo bloquea la política de scripts de Windows.
Say 'Instalando dependencias (1-2 minutos)'
npm.cmd install --no-fund --no-audit
if ($LASTEXITCODE -ne 0) { Die 'npm install ha fallado (mira el error de arriba).' }

Say 'Asistente de Firebase'
Info 'Se abrirá el navegador para iniciar sesión con tu cuenta de Google.'
npm.cmd run setup
