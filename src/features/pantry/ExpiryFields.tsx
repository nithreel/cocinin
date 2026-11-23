import type { ExpiryMode } from '../../lib/collections'
import { inputCompact } from '../../components/inputStyles'

/** Tipo de fecha, fecha y cantidad. Con `trailing` (panel de la fila) se pinta en dos filas con eso a la derecha de
 *  la cantidad; sin él, en línea. */
export default function ExpiryFields({
  mode,
  date,
  quantity,
  onModeChange,
  onDateChange,
  onQuantityChange,
  trailing,
}: {
  mode: ExpiryMode
  date: string
  quantity: string
  onModeChange: (mode: ExpiryMode) => void
  onDateChange: (date: string) => void
  onQuantityChange: (quantity: string) => void
  /** panel del ingrediente: en dos filas (tipo de fecha | fecha; cantidad | alarmas) con esto a la derecha de la cantidad */
  trailing?: React.ReactNode
}) {
  const dateInput =
    mode === 'date' || mode === 'sinceStocked' ? (
      <input autoComplete="off"
        type="date"
        value={date}
        onChange={(e) => onDateChange(e.target.value)}
        className={inputCompact + ' min-w-0 shrink'}
      />
    ) : null
  const select = (
    <select
      value={mode}
      onChange={(e) => onModeChange(e.target.value as ExpiryMode)}
      className={inputCompact + ' min-w-0 shrink'}
    >
      <option value="none">Sin fecha</option>
      <option value="date">Fecha de caducidad</option>
      <option value="sinceStocked">Fecha de compra</option>
    </select>
  )
  const quantityInput = (
    <input autoComplete="off"
      value={quantity}
      onChange={(e) => onQuantityChange(e.target.value)}
      placeholder="Cantidad (ej. 500 g)"
      maxLength={40}
      aria-label="Cantidad que tienes"
      className={inputCompact + ' w-40'}
    />
  )
  // con `trailing` (panel del ingrediente): fila 1 = tipo de fecha | fecha; fila 2 = cantidad | alarmas
  if (trailing) {
    return (
      <>
        <div className="flex w-full items-center justify-between gap-2">
          {select}
          {dateInput}
        </div>
        <div className="flex w-full items-center justify-between gap-2">
          {quantityInput}
          <div className="flex items-center gap-1">{trailing}</div>
        </div>
      </>
    )
  }
  return (
    <>
      {select}
      {dateInput}
      {quantityInput}
    </>
  )
}
