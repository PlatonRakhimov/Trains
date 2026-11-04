import { describe, it, expect } from 'vitest'
import { epley1RM, summarizeSets, formatSets, isPlanMissed, formatNumber } from '../calc.js'
import { exerciseHistory, workoutComparison, findProblems, filterRows, exerciseList } from '../analysis.js'
import { createSampleData } from '../sample.js'
import { createSession } from '../schema.js'
import { backupToJSON, parseBackup } from '../backup.js'

describe('расчёты', () => {
  it('Эпли', () => {
    expect(epley1RM(100, 5)).toBeCloseTo(116.67, 2)
    expect(epley1RM(0, 5)).toBe(0)
  })

  it('сводка игнорирует разминку', () => {
    const sets = [
      { weight: 40, reps: 10, warmup: true },
      { weight: 80, reps: 5 },
      { weight: 85, reps: 3 },
    ]
    expect(summarizeSets(sets)).toMatchObject({ maxWeight: 85, volume: 655, workSets: 2 })
  })

  it('компактная запись', () => {
    expect(formatSets([{ weight: 80, reps: 5 }, { weight: 80, reps: 5 }, { weight: 80, reps: 4 }])).toBe('80: 5/5/4')
    expect(formatSets([{ weight: 80, reps: 5 }, { weight: 85, reps: 3 }])).toBe('80: 5, 85: 3')
    expect(formatSets([{ weight: 0, reps: 30 }, { weight: 0, reps: 25 }])).toBe('30/25')
  })

  it('формат чисел', () => {
    expect(formatNumber(69.6666)).toBe('69.7')
    expect(formatNumber(2090)).toBe('2\u00a0090')
    expect(formatNumber(1072.5)).toBe('1\u00a0072.5')
  })

  it('выполнение плана', () => {
    expect(isPlanMissed([{ reps: 5 }, { reps: 4 }], 5)).toBe(true)
    expect(isPlanMissed([{ reps: 5 }, { reps: 6 }], 5)).toBe(false)
    expect(isPlanMissed([{ reps: 5 }], null)).toBeNull()
  })
})

// Строка CSV в разобранном виде — только нужные поля.
const row = (date, cycle, week, day, exerciseId, weight, reps, plannedReps = 5, setNo = 1) => ({
  date, cycle, week, day, exerciseId, exerciseName: exerciseId, workoutName: '', weight, reps, plannedReps, setNo, warmup: false,
})

describe('аналитика', () => {
  const rows = [
    // Присед в Н1Д1: 3 цикла, вес не растёт, в двух последних недобор.
    row('2026-01-01', 1, 1, 1, 'squat', 100, 5, 5, 1),
    row('2026-01-01', 1, 1, 1, 'squat', 100, 5, 5, 2),
    row('2026-01-22', 2, 1, 1, 'squat', 100, 4, 5, 1),
    row('2026-02-12', 3, 1, 1, 'squat', 100, 5, 5, 1),
    row('2026-02-12', 3, 1, 1, 'squat', 100, 3, 5, 2),
    // Присед в Н2Д1 — растёт.
    row('2026-01-08', 1, 2, 1, 'squat', 105, 5),
    row('2026-01-29', 2, 2, 1, 'squat', 107.5, 5),
    row('2026-02-19', 3, 2, 1, 'squat', 110, 5),
  ]

  it('история сквозь все тренировки и по одной позиции', () => {
    expect(exerciseHistory(rows, 'squat')).toHaveLength(6)
    expect(exerciseHistory(rows, 'squat', { week: 1, day: 1 }).map((e) => e.cycle)).toEqual([1, 2, 3])
  })

  it('сравнение циклов по тренировке', () => {
    const t = workoutComparison(rows, 1, 1)
    expect(t.cycles).toEqual([1, 2, 3])
    expect(t.rows[0].cells.map((c) => c.text)).toEqual(['100: 5/5', '100: 4', '100: 5/3'])
    expect(t.rows[0].cells.map((c) => c.missed)).toEqual([false, true, true])
    expect(t.rows[0].plannedReps).toBe(5)
  })

  it('застой и отсутствие роста — только для Н1Д1', () => {
    const { stalled, noGrowth } = findProblems(rows, { noGrowthCycles: 3 })
    expect(stalled.map((p) => p.code)).toEqual(['Н1Д1'])
    expect(stalled[0].cycles).toEqual([2, 3])
    expect(noGrowth.map((p) => p.code)).toEqual(['Н1Д1'])
  })

  it('упражнения без веса не попадают в «нет роста»', () => {
    const bodyweight = [1, 2, 3].map((c) => row(`2026-0${c}-01`, c, 1, 2, 'plank', 0, 30, 30))
    expect(findProblems(bodyweight).noGrowth).toEqual([])
  })

  it('фильтр по циклам и датам', () => {
    expect(filterRows(rows, { cycleFrom: 2, cycleTo: 2 })).toHaveLength(2)
    expect(filterRows(rows, { dateFrom: '2026-02-01' })).toHaveLength(3)
  })

  it('список упражнений берёт свежее имя', () => {
    const renamed = [...rows, { ...rows[0], date: '2026-03-01', exerciseName: 'Присед со штангой' }]
    expect(exerciseList(renamed)).toEqual([expect.objectContaining({ id: 'squat', name: 'Присед со штангой' })])
  })
})

describe('пример программы и бэкап', () => {
  const { program, exercises } = createSampleData()

  it('3 × 3 × 5 × 5', () => {
    expect(program.weeks).toHaveLength(3)
    for (const w of program.weeks) {
      expect(w.workouts).toHaveLength(3)
      for (const wo of w.workouts) {
        expect(wo.items).toHaveLength(5)
        expect(wo.items.every((i) => i.sets === 5)).toBe(true)
      }
    }
    expect(program.weeks.map((w) => w.name)).toEqual(['Лёгкая', 'Средняя', 'Тяжёлая'])
  })

  it('упражнения в справочнике по одному разу, план ссылается на них', () => {
    const ids = new Set(exercises.map((e) => e.id))
    expect(ids.size).toBe(15)
    expect(program.weeks.flatMap((w) => w.workouts.flatMap((wo) => wo.items)).every((i) => ids.has(i.exerciseId))).toBe(true)
  })

  it('запись хранит снимок плана и имени', () => {
    const session = createSession({ program, exercises, weekIndex: 0, dayIndex: 0, cycle: 1, date: '2026-01-01' })
    exercises[0].name = 'Переименовано'
    program.weeks[0].workouts[0].items[0].reps = 99
    expect(session.exercises[0].exerciseName).toBe('Присед со штангой')
    expect(session.exercises[0].planned.reps).toBe(8)
  })

  it('бэкап туда и обратно', () => {
    const json = backupToJSON({ program, exercises, sessions: [], settings: { weightStep: 2.5 } })
    const back = parseBackup(json)
    expect(back.exercises).toHaveLength(15)
    expect(back.settings.weightStep).toBe(2.5)
  })

  it('чужой или битый файл', () => {
    expect(() => parseBackup('{oops')).toThrow(/не JSON/)
    expect(() => parseBackup('{"app":"other"}')).toThrow(/не бэкап/)
    expect(() => parseBackup(JSON.stringify({ app: 'trains', schemaVersion: 999 }))).toThrow(/новой версией/)
  })
})
