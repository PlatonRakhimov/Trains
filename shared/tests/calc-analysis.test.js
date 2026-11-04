import { describe, it, expect } from 'vitest'
import { epley1RM, summarizeSets, formatSets, formatNumber } from '../calc.js'
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

})

// Строка CSV в разобранном виде — только нужные поля.
const row = (date, cycle, week, day, exerciseId, weight, reps, setNo = 1) => ({
  date, cycle, week, day, exerciseId, exerciseName: exerciseId, workoutName: '', weight, reps, setNo, warmup: false,
})

describe('аналитика', () => {
  const rows = [
    // Присед в Н1Д1: 3 цикла, вес не растёт.
    row('2026-01-01', 1, 1, 1, 'squat', 100, 5, 1),
    row('2026-01-01', 1, 1, 1, 'squat', 100, 5, 2),
    row('2026-01-22', 2, 1, 1, 'squat', 100, 4, 1),
    row('2026-02-12', 3, 1, 1, 'squat', 100, 5, 1),
    row('2026-02-12', 3, 1, 1, 'squat', 100, 3, 2),
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
  })

  it('отсутствие роста — только для Н1Д1', () => {
    const { noGrowth } = findProblems(rows, { noGrowthCycles: 3 })
    expect(noGrowth.map((p) => p.code)).toEqual(['Н1Д1'])
  })

  it('упражнения без веса не попадают в «нет роста»', () => {
    const bodyweight = [1, 2, 3].map((c) => row(`2026-0${c}-01`, c, 1, 2, 'plank', 0, 30))
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

describe('личная программа и бэкап', () => {
  const { program, exercises } = createSampleData()

  it('сохраняет недели, дни и число упражнений из CSV', () => {
    expect(program.weeks.map((w) => w.workouts.map((wo) => wo.items.length))).toEqual([
      [6, 6, 4], [5, 5, 5], [3, 4, 4],
    ])
    expect(program.weeks.map((w) => w.name)).toEqual(['Лёгкая', 'Средняя', 'Тяжёлая'])
  })

  it('упражнения в справочнике по одному разу, программа ссылается на них', () => {
    const ids = new Set(exercises.map((e) => e.id))
    expect(ids.size).toBe(20)
    expect(program.weeks.flatMap((w) => w.workouts.flatMap((wo) => wo.items)).every((i) => ids.has(i.exerciseId))).toBe(true)
  })

  it('запись хранит снимок имени', () => {
    const session = createSession({ program, exercises, weekIndex: 0, dayIndex: 0, cycle: 1, date: '2026-01-01' })
    exercises[0].name = 'Переименовано'
    expect(session.exercises[0].exerciseName).toBe('Ручка на лямках 50 мм')
  })

  it('бэкап туда и обратно', () => {
    const json = backupToJSON({ program, exercises, sessions: [], settings: { weightStep: 2.5 } })
    const back = parseBackup(json)
    expect(back.exercises).toHaveLength(20)
    expect(back.settings.weightStep).toBe(2.5)
  })

  it('чужой или битый файл', () => {
    expect(() => parseBackup('{oops')).toThrow(/не JSON/)
    expect(() => parseBackup('{"app":"other"}')).toThrow(/не бэкап/)
    expect(() => parseBackup(JSON.stringify({ app: 'trains', schemaVersion: 999 }))).toThrow(/новой версией/)
  })
})

it('восстанавливает старый бэкап без плана, сохраняя подходы', () => {
  const { program, exercises } = createSampleData()
  const item = program.weeks[0].workouts[0].items[0]
  Object.assign(item, { sets: 5, reps: 8, weight: 80, note: 'старый план' })
  const session = createSession({ program, exercises, weekIndex: 0, dayIndex: 0, cycle: 1, date: '2026-01-01' })
  session.exercises[0].planned = { sets: 5, reps: 8, weight: 80 }
  session.exercises[0].sets.push({ weight: 75, reps: 7 })
  const back = parseBackup(JSON.stringify({ app: 'trains', schemaVersion: 1, program, exercises, sessions: [session] }))
  expect(back.program.weeks[0].workouts[0].items[0]).toEqual({ id: item.id, exerciseId: item.exerciseId })
  expect(back.sessions[0].exercises[0]).not.toHaveProperty('planned')
  expect(back.sessions[0].exercises[0].sets).toEqual([{ weight: 75, reps: 7 }])
})

it('обновляет программу, сохраняя id тренировок и существующих упражнений', () => {
  const existing = createSampleData()
  const workoutId = existing.program.weeks[0].workouts[0].id
  const finger = existing.exercises.find((e) => e.name === 'Большой палец')
  const updated = createSampleData(existing)
  expect(updated.program.weeks[0].workouts[0].id).toBe(workoutId)
  expect(updated.exercises.find((e) => e.name === 'Большой палец').id).toBe(finger.id)
  expect(updated.exercises.filter((e) => e.name === 'Продавливание резины')).toHaveLength(1)
  const exerciseNames = new Map(updated.exercises.map((e) => [e.id, e.name]))
  expect(updated.program.weeks[2].workouts[0].items.map((i) => exerciseNames.get(i.exerciseId))).toEqual([
    'Бок на ручке тотраза', 'Отведение срыв', 'Пронатор на блоке',
  ])
})
