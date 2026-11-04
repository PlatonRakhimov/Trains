// Состояние приложения и его сохранение в IndexedDB.
//
// Почему IndexedDB (через маленькую библиотеку idb-keyval), а не localStorage:
//  - браузер чаще сохраняет IndexedDB при нехватке места, особенно после storage.persist();
//  - лимит localStorage ~5 МБ; нам хватило бы, но запаса нет;
//  - API idb-keyval такое же простое: get(key) / set(key, value).
//
// Как работает автосохранение: всё состояние лежит в одном reactive-объекте.
// На каждую часть (программа, справочник, журнал, настройки) повешен watch:
// изменили что угодно — эта часть сразу записывается в базу. Кнопки «Сохранить» нет.

import { reactive, watch } from 'vue'
import { get, set } from 'idb-keyval'
import { createSampleData } from '@shared/sample.js'
import { DEFAULT_WEIGHT_STEP, createSession, createExercise } from '@shared/schema.js'
import { todayISO } from '@shared/date.js'

const KEYS = ['program', 'exercises', 'sessions', 'settings']

export const state = reactive({
  loaded: false,
  saveError: '',
  program: { weeks: [] },
  exercises: [],
  // Журнал тренировок в порядке создания (это важно для подсчёта следующей тренировки).
  sessions: [],
  settings: {},
})

function defaultSettings() {
  return {
    weightStep: DEFAULT_WEIGHT_STEP,
    lastExportAt: null,
    persistRequested: false,
  }
}

// Vue хранит данные в «обёртках» (Proxy), а IndexedDB умеет сохранять только обычные объекты.
// Самый простой надёжный способ получить чистую копию — через JSON.
const plain = (value) => JSON.parse(JSON.stringify(value))

async function save(key) {
  try {
    await set(key, plain(state[key]))
    state.saveError = ''
  } catch (err) {
    state.saveError = 'Не удалось сохранить данные: ' + (err?.message || err)
  }
}

export async function loadState() {
  const [program, exercises, sessions, settings] = await Promise.all(KEYS.map((k) => get(k)))

  const firstRun = !program || !exercises
  if (firstRun) {
    const sample = createSampleData()
    state.program = sample.program
    state.exercises = sample.exercises
  } else {
    state.program = program
    state.exercises = exercises
  }
  state.sessions = sessions ?? []
  state.settings = { ...defaultSettings(), ...settings }

  // Подписываемся на изменения только ПОСЛЕ загрузки, иначе затёрли бы базу пустыми данными.
  for (const key of KEYS) {
    watch(() => state[key], () => save(key), { deep: true })
  }
  if (firstRun) await Promise.all(KEYS.map(save))

  state.loaded = true
  requestPersistentStorage()
}

// Просим браузер не удалять наши данные при нехватке места. Спрашиваем один раз.
async function requestPersistentStorage() {
  if (state.settings.persistRequested) return
  state.settings.persistRequested = true
  try {
    await navigator.storage?.persist?.()
  } catch {
    // Не поддерживается — ничего страшного.
  }
}

// Заменить все данные содержимым бэкапа (после подтверждения пользователем).
// Watch-и сами запишут новые данные в базу.
export function replaceAllData(backup) {
  state.program = backup.program
  state.exercises = backup.exercises
  state.sessions = backup.sessions
  state.settings = {
    ...defaultSettings(),
    ...backup.settings,
    // Разрешение на постоянное хранение относится к этому телефону, а не к бэкапу.
    persistRequested: state.settings.persistRequested,
    // Восстановленные данные уже есть в файле бэкапа — значит, последний экспорт был в момент его создания.
    lastExportAt: backup.exportedAt ?? backup.settings?.lastExportAt ?? null,
  }
}

// Сколько дней назад был последний экспорт (null — ещё ни разу).
export function daysSinceExport() {
  const at = state.settings.lastExportAt
  if (!at) return null
  return Math.floor((Date.now() - new Date(at).getTime()) / (24 * 60 * 60 * 1000))
}

// Пора ли напомнить про бэкап: есть записи и экспорта не было больше 7 дней.
export const EXPORT_REMINDER_DAYS = 7

export function exportReminderDue() {
  if (state.sessions.length === 0) return false
  const days = daysSinceExport()
  return days == null || days > EXPORT_REMINDER_DAYS
}

// ---------- Помощники ----------

export function findSession(id) {
  return state.sessions.find((s) => s.id === id) ?? null
}

export function exerciseById(id) {
  return state.exercises.find((e) => e.id === id) ?? null
}

// Шаг кнопок ± для веса: свой у упражнения или общий из настроек.
export function weightStepFor(exerciseId) {
  return exerciseById(exerciseId)?.weightStep || state.settings.weightStep || DEFAULT_WEIGHT_STEP
}

// Начать тренировку по программе. Запись сразу попадает в журнал.
export function startSession(weekIndex, dayIndex, cycle) {
  const session = createSession({
    program: state.program,
    exercises: state.exercises,
    weekIndex,
    dayIndex,
    cycle,
    date: todayISO(),
  })
  state.sessions.push(session)
  return session.id
}

export function deleteSession(id) {
  const i = state.sessions.findIndex((s) => s.id === id)
  if (i !== -1) state.sessions.splice(i, 1)
}

// Открыли тренировку и ничего не записали — удаляем её при выходе,
// чтобы случайное открытие не сдвинуло «следующую тренировку».
export function removeIfEmpty(id) {
  const s = findSession(id)
  if (s && s.exercises.every((e) => e.sets.length === 0 && !e.note)) deleteSession(id)
}

// Новое упражнение в справочник (например, разовое из зала).
export function addExerciseToCatalog(name) {
  const ex = createExercise(name.trim())
  state.exercises.push(ex)
  return ex
}

// Тренировка программы по id вместе с её неделей и позициями.
export function findWorkout(workoutId) {
  for (let w = 0; w < state.program.weeks.length; w++) {
    const week = state.program.weeks[w]
    const d = week.workouts.findIndex((wo) => wo.id === workoutId)
    if (d !== -1) return { week, workout: week.workouts[d], weekIndex: w, dayIndex: d }
  }
  return null
}

// Сколько раз упражнение встречается в плане программы.
export function usageInProgram(exerciseId) {
  let count = 0
  for (const week of state.program.weeks) {
    for (const workout of week.workouts) {
      count += workout.items.filter((item) => item.exerciseId === exerciseId).length
    }
  }
  return count
}

// Переставить элемент массива на delta позиций (−1 — выше, +1 — ниже).
export function moveItem(array, index, delta) {
  const to = index + delta
  if (to < 0 || to >= array.length) return
  const [item] = array.splice(index, 1)
  array.splice(to, 0, item)
}
