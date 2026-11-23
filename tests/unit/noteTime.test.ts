import { describe, expect, it } from 'vitest'
import { defaultRemindAt, reminderChanged } from '../../src/lib/noteTime'

describe('notas', () => {
  it('propone la próxima hora en punto', () => {
    const now = new Date(2026, 10, 18, 17, 23).getTime()
    expect(new Date(defaultRemindAt(now)).getHours()).toBe(18)
    expect(new Date(defaultRemindAt(now)).getMinutes()).toBe(0)
  })
  it('solo rearma si cambia hora, activación o destinatarios', () => {
    const a = { notify: true, remindAt: 1000, recipients: ['x', 'y'] }
    expect(reminderChanged(a, { ...a, recipients: ['y', 'x'] })).toBe(false)
    expect(reminderChanged(a, { ...a, remindAt: 2000 })).toBe(true)
    expect(reminderChanged(a, { ...a, recipients: ['x'] })).toBe(true)
  })
})
