import { describe, it, expect } from 'vitest'
import { suggestNext, cycleForManualPick, previousSameWorkout, positionAfter } from '../order.js'

// Программа 3 недели: 3, 2 и 3 тренировки (число тренировок может отличаться).
const program = {
  weeks: [
    { id: 'w1', workouts: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] },
    { id: 'w2', workouts: [{ id: 'd' }, { id: 'e' }] },
    { id: 'w3', workouts: [{ id: 'f' }, { id: 'g' }, { id: 'h' }] },
  ],
}

const s = (id, workoutId, cycle, extra = {}) => ({ id, workoutId, cycle, exercises: [], ...extra })

describe('следующая тренировка', () => {
  it('первый запуск — Н1Д1, цикл 1', () => {
    expect(suggestNext(program, [])).toEqual({ weekIndex: 0, dayIndex: 0, cycle: 1 })
  })

  it('после Н1Д3 идёт Н2Д1', () => {
    expect(suggestNext(program, [s('1', 'c', 1)])).toEqual({ weekIndex: 1, dayIndex: 0, cycle: 1 })
  })

  it('после последней тренировки цикла — Н1Д1 следующего цикла', () => {
    expect(suggestNext(program, [s('1', 'h', 4)])).toEqual({ weekIndex: 0, dayIndex: 0, cycle: 5 })
  })

  it('ручная правка цикла продолжает счёт от исправленного', () => {
    const log = [s('1', 'a', 1), s('2', 'b', 7)]
    expect(suggestNext(program, log).cycle).toBe(7)
  })

  it('берёт последнюю по порядку записи, а не по дате', () => {
    const log = [s('1', 'a', 1, { date: '2026-05-01' }), s('2', 'b', 1, { date: '2026-04-01' })]
    expect(suggestNext(program, log)).toMatchObject({ weekIndex: 0, dayIndex: 2 })
  })

  it('пропускает пустые недели', () => {
    const p = { weeks: [{ workouts: [{ id: 'a' }] }, { workouts: [] }, { workouts: [{ id: 'z' }] }] }
    expect(positionAfter(p, { weekIndex: 0, dayIndex: 0 })).toEqual({ weekIndex: 2, dayIndex: 0, wrapped: false })
  })

  it('находит тренировку по номерам, если id не совпал', () => {
    const log = [s('1', 'старый', 1, { weekNo: 2, dayNo: 2 })]
    expect(suggestNext(program, log)).toMatchObject({ weekIndex: 2, dayIndex: 0, cycle: 1 })
  })

  it('пустая программа — null', () => {
    expect(suggestNext({ weeks: [] }, [])).toBeNull()
  })
})

describe('цикл при ручном выборе', () => {
  const log = [s('1', 'd', 3)] // последняя — Н2Д1 цикла 3

  it('выбрали тренировку дальше по циклу — тот же цикл', () => {
    expect(cycleForManualPick(program, log, 2, 1)).toBe(3)
  })

  it('выбрали тренировку раньше — следующий цикл', () => {
    expect(cycleForManualPick(program, log, 0, 0)).toBe(4)
  })
})

describe('прошлый цикл этой же тренировки', () => {
  it('ищет ту же позицию в более раннем цикле', () => {
    const log = [s('1', 'a', 1), s('2', 'b', 1), s('3', 'a', 2), s('4', 'b', 2)]
    expect(previousSameWorkout(log, { workoutId: 'a', cycle: 3 }).id).toBe('3')
    expect(previousSameWorkout(log, { workoutId: 'a', cycle: 2 }).id).toBe('1')
    expect(previousSameWorkout(log, { workoutId: 'a', cycle: 1 })).toBeNull()
  })
})
