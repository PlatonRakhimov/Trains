// Базовые структуры данных и маленькие помощники.
// Здесь нет Vue и браузерных API — этот файл используют оба приложения и тесты.

// Версия формата бэкапа. Увеличиваем, если меняем структуру данных несовместимо.
export const SCHEMA_VERSION = 2

// Шаг кнопок ± для веса, если у упражнения не задан свой.
export const DEFAULT_WEIGHT_STEP = 2.5

// Названия недель по умолчанию (для 4-й и дальше — пусто, покажем «Неделя N»).
export const DEFAULT_WEEK_NAMES = ['Лёгкая', 'Средняя', 'Тяжёлая']

// Короткий уникальный id: префикс + время + случайный хвост.
// Например: "ex_lq3k9z4abc". Уникальности на одном телефоне хватает с запасом.
export function newId(prefix) {
  const time = Date.now().toString(36)
  const rand = Math.random().toString(36).slice(2, 7)
  return `${prefix}_${time}${rand}`
}

// ---------- Справочник упражнений ----------

// weightStep: null — значит используется общий шаг из настроек.
export function createExercise(name) {
  return { id: newId('ex'), name, weightStep: null }
}

// ---------- Программа ----------

export function createProgram() {
  return { weeks: [] }
}

// index — позиция новой недели (0, 1, 2…), нужна только для названия по умолчанию.
export function createWeek(index = 0) {
  return { id: newId('w'), name: DEFAULT_WEEK_NAMES[index] ?? '', workouts: [] }
}

export function createWorkout() {
  return { id: newId('wo'), name: '', items: [] }
}

// Упражнение в программе: только ссылка на справочник.
export function createWorkoutItem(exerciseId) {
  return { id: newId('it'), exerciseId }
}

// ---------- Лог тренировок ----------

// Один подход. flag: '' | '+' | '!'
// rpe: null или число 1–10 (необязательно), note — короткая заметка к подходу.
export function createSet({ weight = 0, reps = 0, warmup = false, flag = '', rpe = null, note = '' } = {}) {
  return { id: newId('set'), weight, reps, warmup, flag, rpe, note }
}

// Упражнение внутри записанной тренировки.
// exerciseName — снимок имени, чтобы переименование не меняло старые записи.
export function createSessionExercise(exercise) {
  return {
    id: newId('se'),
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    note: '',
    sets: [],
  }
}

// Новая тренировка по программе.
// weekIndex/dayIndex — позиции с нуля, в записи храним номера с единицы.
export function createSession({ program, exercises, weekIndex, dayIndex, cycle, date }) {
  const week = program.weeks[weekIndex]
  const workout = week.workouts[dayIndex]
  const byId = new Map(exercises.map((e) => [e.id, e]))

  return {
    id: newId('s'),
    date,
    cycle,
    weekId: week.id,
    workoutId: workout.id,
    weekNo: weekIndex + 1,
    dayNo: dayIndex + 1,
    weekName: week.name,
    workoutName: workout.name,
    exercises: workout.items
      // Если упражнение удалили из справочника, а в программе осталась ссылка — пропускаем.
      .filter((item) => byId.has(item.exerciseId))
      .map((item) => createSessionExercise(byId.get(item.exerciseId))),
  }
}

// ---------- Подписи для интерфейса ----------

export function weekLabel(week, index) {
  return week.name || `Неделя ${index + 1}`
}

export function workoutLabel(workout, index) {
  return workout.name || `День ${index + 1}`
}

// Короткий код тренировки: Н1Д2
export function workoutCode(weekNo, dayNo) {
  return `Н${weekNo}Д${dayNo}`
}

// Старые записи сохраняем, удаляя только больше не используемые поля плана.
export function removeLegacyPlan({ program, sessions }) {
  for (const week of program.weeks) {
    for (const workout of week.workouts) {
      workout.items = workout.items.map(({ id, exerciseId }) => ({ id, exerciseId }))
    }
  }
  for (const session of sessions) {
    for (const exercise of session.exercises) delete exercise.planned
  }
}
