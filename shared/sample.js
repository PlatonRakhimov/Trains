// Начальная программа из «Тренировки после 06.09 - Лист1.csv».
import { createExercise, createProgram, createWeek, createWorkout, createWorkoutItem } from './schema.js'

export const PROGRAM_REVISION = 'personal-2026-11-05-confirmed'

// Неделя → день → упражнения; пустые ячейки CSV пропущены.
const WEEKS = [
  [
    ['Ручка на лямках 50 мм', 'Большой палец', 'Кисть с упором', 'Отведение — динамика', 'Спина', 'Продавливание резины'],
    ['Бицепс сидя', 'Жим лёжа', 'Луч', 'Ротация плеча', 'Отработка с резиной', 'Трицепс за столом'],
    ['Кисть с упором', 'Отведение — динамика', 'Спина', 'Пронатор с пола'],
  ],
  [
    ['Ручка на лямках 50 мм', 'Пронатор на блоке', 'Кисть в стол', 'Продавливание резины', 'Бок на блоке'],
    ['Бицепс сидя', 'Трицепс за столом', 'Луч', 'Спина', 'Отведение — динамика'],
    ['Пронатор на блоке', 'Кисть в стол', 'Пронатор с пола', 'Большой палец', 'Отработка с резиной'],
  ],
  [
    ['Бок на ручке тотраза', 'Отведение срыв', 'Пронатор на блоке'],
    ['Луч срыв', 'Трицепс за столом — лёгкий', 'Спина', 'Большой палец'],
    ['Кисть в стол', 'Пронатор на блоке', 'Ротация плеча', 'Продавливание резины'],
  ],
]

// Передаём существующие данные, чтобы сохранить id справочника и тренировок.
export function createSampleData(existing = {}) {
  const exercises = [...(existing.exercises ?? [])]
  const byName = new Map(exercises.map((ex) => [ex.name, ex]))
  const program = createProgram()
  WEEKS.forEach((days, w) => {
    const oldWeek = existing.program?.weeks[w]
    const week = createWeek(w)
    if (oldWeek) week.id = oldWeek.id
    days.forEach((names, d) => {
      const oldWorkout = oldWeek?.workouts[d]
      const workout = createWorkout()
      if (oldWorkout) workout.id = oldWorkout.id
      for (const name of names) {
        if (!byName.has(name)) {
          const exercise = createExercise(name)
          exercises.push(exercise)
          byName.set(name, exercise)
        }
        workout.items.push(createWorkoutItem(byName.get(name).id))
      }
      week.workouts.push(workout)
    })
    program.weeks.push(week)
  })
  return { program, exercises }
}
