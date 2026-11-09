import type { ReactNode } from 'react'

// Iconos de la navegación: trazo redondeado grueso, en la línea del icono de la app.
export type IconSize = 16 | 20 | 24
const SIZE: Record<IconSize, string> = { 16: 'h-4 w-4', 20: 'h-5 w-5', 24: 'h-6 w-6' }

function Icon({ children, size = 24 }: { children: ReactNode; size?: IconSize }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={SIZE[size] + ' shrink-0'}
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

export function XIcon({ size = 16 }: { size?: IconSize }) {
  return (
    <Icon size={size}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Icon>
  )
}

export function SnowflakeIcon({ className = 'h-5 w-5' }: { className?: string }) {
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
    </svg>
  )
}

export function BellIcon({ size }: { size?: IconSize }) {
  return (
    <Icon size={size}>
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

export function PlusIcon({ size = 16 }: { size?: IconSize }) {
  return (
    <Icon size={size}>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  )
}

export function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={'h-4 w-4 shrink-0 transition-transform motion-reduce:transition-none ' + (open ? 'rotate-90' : '')}
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

export function KebabIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="5" r="1.75" />
      <circle cx="12" cy="12" r="1.75" />
      <circle cx="12" cy="19" r="1.75" />
    </svg>
  )
}

export function CopyIcon() {
  return (
    <Icon size={20}>
      <rect x="9" y="9" width="11" height="11" rx="2.5" />
      <path d="M5 15V6.5A2.5 2.5 0 0 1 7.5 4H15" />
    </Icon>
  )
}

export function CheckIcon() {
  return (
    <Icon size={20}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </Icon>
  )
}
