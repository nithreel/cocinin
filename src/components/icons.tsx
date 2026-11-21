import type { ReactNode } from 'react'

// Iconos de la navegación: trazo redondeado grueso, en la línea del icono de la app.
function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4ZM13.5 6.5l4 4" />
    </svg>
  )
}

export function PantryIcon() {
  return (
    <Icon>
      <path d="M8.5 3h7" />
      <rect x="5" y="6" width="14" height="15" rx="4" />
      <path d="M5 12.5h14" />
    </Icon>
  )
}

export function CartIcon() {
  return (
    <Icon>
      <path d="M3 4h2.2l2.1 10.5h10.2l2-7.5H6" />
      <circle cx="9.5" cy="19" r="1.3" />
      <circle cx="16.5" cy="19" r="1.3" />
    </Icon>
  )
}

export function BookIcon() {
  return (
    <Icon>
      <path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v14H7.5A2.5 2.5 0 0 0 5 19.5z" />
      <path d="M5 19.5A2.5 2.5 0 0 0 7.5 22H19v-5" />
    </Icon>
  )
}

export function UsersIcon() {
  return (
    <Icon>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20c0-3.3 2.4-5.5 5.5-5.5s5.5 2.2 5.5 5.5" />
      <circle cx="17" cy="9" r="2.4" />
      <path d="M16.6 14.6c2.6 0 4.4 1.7 4.4 4.4" />
    </Icon>
  )
}

export function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

/** `crossed`: copo tachado en rojo = descongelando. */
export function SnowflakeIcon({ className = 'h-5 w-5', crossed = false }: { className?: string; crossed?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5L4.2 16.5" />
      <path d="M9.6 4.6 12 6.8l2.4-2.2M9.6 19.4 12 17.2l2.4 2.2M5.3 10.2l3 .6-.8 2.9M18.7 13.8l-3-.6.8-2.9M5.3 13.8l3-.6-.8-2.9M18.7 10.2l-3 .6.8 2.9" />
      {crossed && <path d="M3.5 3.5l17 17" strokeWidth={3} className="text-red-500 dark:text-red-400" stroke="currentColor" />}
    </svg>
  )
}

export function BellIcon() {
  return (
    <Icon>
      <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z" />
      <path d="M10 21.5h4" />
    </Icon>
  )
}

export function LogoutIcon() {
  return (
    <Icon>
      <path d="M10 4.5H7A2.5 2.5 0 0 0 4.5 7v10A2.5 2.5 0 0 0 7 19.5h3" />
      <path d="M15 8l4 4-4 4M19 12H9.5" />
    </Icon>
  )
}

export function DownloadIcon() {
  return (
    <Icon>
      <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5" />
      <path d="M5 19.5h14" />
    </Icon>
  )
}

export function NoteIcon() {
  return (
    <Icon>
      <path d="M6.5 3.5h11A1.5 1.5 0 0 1 19 5v10l-4 5H6.5A1.5 1.5 0 0 1 5 18.5V5a1.5 1.5 0 0 1 1.5-1.5z" />
      <path d="M15 20v-3.5a1 1 0 0 1 1-1h3M8.5 8.5h7M8.5 12h5" />
    </Icon>
  )
}

/** Triangulito de los grupos desplegables (▶ cerrado, ▼ abierto): gira con rebote. */
export function CaretIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={'caret h-2.5 w-2.5 shrink-0 ' + (open ? 'rotate-90' : '')} fill="currentColor" aria-hidden="true">
      <path d="M6 3.5l13.5 8.5L6 20.5z" />
    </svg>
  )
}

export function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={'caret h-4 w-4 shrink-0 ' + (open ? 'rotate-90' : '')}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  )
}

export function AlertIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3.5 2.5 20h19L12 3.5Z" />
      <path d="M12 10v4.5M12 17.5v.01" />
    </svg>
  )
}

/** Rueda de ajustes (barra superior): gira al desplegar los iconos. */
export function GearIcon() {
  return (
    <Icon>
      {/* 8 dientes generados alrededor de (12, 12): centrada, para que el giro no cabecee */}
      <path d="M9.81 4.93 L10.38 2.54 L13.62 2.54 L14.19 4.93 L15.45 5.45 L17.54 4.16 L19.84 6.46 L18.55 8.55 L19.07 9.81 L21.46 10.38 L21.46 13.62 L19.07 14.19 L18.55 15.45 L19.84 17.54 L17.54 19.84 L15.45 18.55 L14.19 19.07 L13.62 21.46 L10.38 21.46 L9.81 19.07 L8.55 18.55 L6.46 19.84 L4.16 17.54 L5.45 15.45 L4.93 14.19 L2.54 13.62 L2.54 10.38 L4.93 9.81 L5.45 8.55 L4.16 6.46 L6.46 4.16 L8.55 5.45Z" />
      <circle cx="12" cy="12" r="2.8" />
    </Icon>
  )
}

/** Deslizadores: «Ajustes adicionales» (distinto de la rueda, para no ver dos iguales). */
export function SlidersIcon() {
  return (
    <Icon>
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="9" cy="17" r="2" />
    </Icon>
  )
}
