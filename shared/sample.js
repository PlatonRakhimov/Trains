// Пример программы для первого запуска: 3 недели × 3 тренировки × 5 упражнений × 5 подходов.
// Пользователь заменит её своей через редактор.
import { createExercise, createProgram, createWeek, createWorkout, createPlanItem } from './schema.js'

// Повторы по неделям: лёгкая / средняя / тяжёлая.
const REPS_BY_WEEK = [8, 6, 4]

// Три разных дня, в каждом по 5 упражнений. Числа — плановый вес для средней недели.
const DAYS = [
  [
    ['Присед со штангой', 80],
    ['Жим лёжа', 60],
    ['Тяга штанги в наклоне', 55],
    ['Выпады с гантелями', 16],
    ['Планка', null],
  ],
  [
    ['Становая тяга', 100],
    ['Жим штанги стоя', 40],
    ['Подтягивания', null],
    ['Румынская тяга', 70],
    ['Скручивания', null],
  ],
  [
    ['Фронтальный присед', 60],
    ['Жим гантелей на наклонной', 22],
    ['Тяга верхнего блока', 50],
    ['Жим ногами', 120],
    ['Подъём штанги на бицепс', 25],
  ],
]

// Лёгкая неделя -10 %, тяжёлая +10 %, округляем до 2.5 кг.
const WEIGHT_FACTOR = [0.9, 1, 1.1]
const roundTo = (n, step) => Math.round(n / step) * step

export function createSampleData() {
  // Справочник: каждое упражнение один раз, дальше ссылки по id.
  const exercises = []
  const byName = new Map()
  for (const day of DAYS) {
    for (const [name] of day) {
      if (!byName.has(name)) {
        const ex = createExercise(name)
        exercises.push(ex)
        byName.set(name, ex)
      }
    }
  }

  const program = createProgram()
  REPS_BY_WEEK.forEach((reps, w) => {
    const week = createWeek(w)
    for (const day of DAYS) {
      const workout = createWorkout()
      for (const [name, weight] of day) {
        workout.items.push(
          createPlanItem(byName.get(name).id, {
            sets: 5,
            reps,
            weight: weight == null ? null : roundTo(weight * WEIGHT_FACTOR[w], 2.5),
          }),
        )
      }
      week.workouts.push(workout)
    }
    program.weeks.push(week)
  })

  return { program, exercises }
}
