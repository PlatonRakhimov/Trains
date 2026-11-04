// Полный бэкап в JSON: программа, справочник, лог, настройки.
import { SCHEMA_VERSION } from './schema.js'

export function makeBackup({ program, exercises, sessions, settings }) {
  return {
    app: 'trains',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    program,
    exercises,
    sessions,
    settings,
  }
}

export function backupToJSON(data) {
  return JSON.stringify(makeBackup(data), null, 2)
}

// Разбор и проверка бэкапа перед импортом.
// Бросает ошибку с понятным текстом — её можно показать пользователю как есть.
export function parseBackup(text) {
  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('Файл повреждён или это не JSON')
  }

  if (!data || data.app !== 'trains') throw new Error('Это не бэкап этого приложения')
  if (typeof data.schemaVersion !== 'number' || data.schemaVersion > SCHEMA_VERSION) {
    throw new Error('Бэкап сделан более новой версией приложения — обновите приложение')
  }
  if (!data.program || !Array.isArray(data.program.weeks)) throw new Error('В бэкапе нет программы')
  if (!Array.isArray(data.exercises)) throw new Error('В бэкапе нет справочника упражнений')
  if (!Array.isArray(data.sessions)) throw new Error('В бэкапе нет журнала тренировок')

  return {
    program: data.program,
    exercises: data.exercises,
    sessions: data.sessions,
    settings: data.settings ?? {},
    exportedAt: data.exportedAt ?? null,
  }
}

// Короткая сводка для окна подтверждения: «Заменить данные? В файле 42 тренировки…»
export function backupSummary(backup) {
  const sets = backup.sessions.reduce(
    (sum, s) => sum + s.exercises.reduce((n, e) => n + e.sets.length, 0),
    0,
  )
  return { sessions: backup.sessions.length, sets, exercises: backup.exercises.length }
}
