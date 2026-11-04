import { describe, it, expect } from 'vitest'
import { parseCSVText, parseWorkoutsCSV, rowsToCSV, sessionsToCSV, CSV_COLUMNS } from '../csv.js'

const session = {
  id: 's1',
  date: '2026-11-01',
  cycle: 2,
  weekNo: 1,
  dayNo: 3,
  workoutName: 'Ноги, "тяжёлый"',
  exercises: [
    {
      exerciseId: 'ex_squat',
      exerciseName: 'Присед',
      planned: { sets: 3, reps: 5, weight: 100 },
      note: 'колено, ок',
      sets: [
        { weight: 60, reps: 8, warmup: true, flag: '', rpe: null, note: '' },
        { weight: 100, reps: 5, warmup: false, flag: '+', rpe: 8, note: '' },
        { weight: 102.5, reps: 4, warmup: false, flag: '!', rpe: null, note: 'сорвал\nпоследний' },
      ],
    },
    {
      exerciseId: 'ex_extra',
      exerciseName: 'Разовое',
      planned: null,
      note: '',
      sets: [{ weight: 10, reps: 12, warmup: false, flag: '', rpe: null, note: '' }],
    },
  ],
}

describe('генерация CSV', () => {
  const text = sessionsToCSV([session])

  it('начинается с BOM и заголовка', () => {
    expect(text.startsWith('﻿' + CSV_COLUMNS.join(','))).toBe(true)
  })

  it('одна строка на подход', () => {
    expect(parseCSVText(text)).toHaveLength(1 + 4)
  })

  it('экранирует кавычки, запятые и переносы', () => {
    expect(text).toContain('"Ноги, ""тяжёлый"""')
    expect(text).toContain('"сорвал\nпоследний"')
  })

  it('десятичная точка', () => {
    expect(text).toContain(',102.5,')
  })

  it('не экспортирует старые поля плана', () => {
    expect(text).not.toContain('planned_')
    expect(parseWorkoutsCSV(text)[0]).not.toHaveProperty('plannedReps')
  })
})

describe('разбор CSV', () => {
  it('туда и обратно без потерь', () => {
    const rows = parseWorkoutsCSV(sessionsToCSV([session]))
    expect(rows).toHaveLength(4)
    expect(rows[0]).toMatchObject({ warmup: true, setNo: 1, weight: 60, note: 'колено, ок' })
    expect(rows[1]).toMatchObject({
      date: '2026-11-01',
      cycle: 2,
      week: 1,
      day: 3,
      workoutName: 'Ноги, "тяжёлый"',
      exerciseName: 'Присед',
      weight: 100,
      reps: 5,
      flag: '+',
      rpe: 8,
      warmup: false,
    })
    expect(rows[2].note).toBe('сорвал\nпоследний')
  })

  it('понимает файл без BOM, с \\n и без колонки warmup', () => {
    const text = 'date,exercise_id,exercise_name,weight,reps\n2026-01-01,ex1,Жим,60,10\n'
    const rows = parseWorkoutsCSV(text)
    expect(rows).toEqual([expect.objectContaining({ exerciseName: 'Жим', weight: 60, reps: 10, warmup: false })])
  })

  it('понимает десятичную запятую в кавычках (после русского Excel)', () => {
    const rows = parseWorkoutsCSV('date,exercise_id,weight,reps\r\n2026-01-01,ex1,"62,5",8')
    expect(rows[0].weight).toBe(62.5)
  })

  it('порядок колонок не важен', () => {
    const rows = parseWorkoutsCSV('reps,weight,exercise_id,date\n5,80,ex1,2026-01-01')
    expect(rows[0]).toMatchObject({ reps: 5, weight: 80, exerciseId: 'ex1' })
  })

  it('понятная ошибка для чужого файла', () => {
    expect(() => parseWorkoutsCSV('a,b,c\n1,2,3')).toThrow(/не файл тренировок/)
    expect(() => parseWorkoutsCSV('')).toThrow(/пустой/)
  })

  it('пустой лог даёт только заголовок', () => {
    expect(parseWorkoutsCSV(rowsToCSV([]))).toEqual([])
  })
})

 it('читает старый CSV, игнорируя план', () => {
   const rows = parseWorkoutsCSV('date,exercise_id,weight,reps,planned_reps,planned_weight\n2026-01-01,ex1,80,5,6,85')
   expect(rows[0]).toMatchObject({ weight: 80, reps: 5 })
   expect(rows[0]).not.toHaveProperty('plannedReps')
 })
