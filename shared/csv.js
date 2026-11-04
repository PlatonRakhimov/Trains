// CSV — общий контракт между телефоном и десктопом.
// Одна строка = один подход. UTF-8 с BOM, разделитель — запятая, десятичная точка.

// Порядок колонок. Последняя колонка warmup — наше расширение контракта:
// "1" для разминочного подхода, пусто для рабочего. Парсер работает и без неё.
export const CSV_COLUMNS = [
  'date',
  'cycle',
  'week',
  'day',
  'workout_name',
  'exercise_id',
  'exercise_name',
  'set_no',
  'weight',
  'reps',
  'planned_reps',
  'planned_weight',
  'flag',
  'rpe',
  'note',
  'warmup',
]

// BOM — невидимый символ в начале файла. По нему Excel понимает, что файл в UTF-8,
// и показывает кириллицу нормально, а не «кракозябрами».
const BOM = '﻿'

// ---------- Генерация ----------

// Экранирование значения: если внутри есть запятая, кавычка или перенос строки —
// оборачиваем в кавычки, а сами кавычки удваиваем ("a"b" → "a""b").
function escapeValue(value) {
  if (value == null) return ''
  const s = String(value)
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

// Заметка к подходу и к упражнению склеиваются в одну колонку note.
function joinNotes(...notes) {
  return notes.filter((n) => n && n.trim()).join('; ')
}

// Из массива тренировок (лог с телефона) делаем массив строк-объектов.
// Заметка упражнения пишется в первый подход, чтобы не дублировать её в каждой строке.
export function sessionsToRows(sessions) {
  const rows = []
  for (const session of sessions) {
    for (const ex of session.exercises) {
      ex.sets.forEach((set, i) => {
        rows.push({
          date: session.date,
          cycle: session.cycle,
          week: session.weekNo ?? '',
          day: session.dayNo ?? '',
          workout_name: session.workoutName ?? '',
          exercise_id: ex.exerciseId,
          exercise_name: ex.exerciseName,
          set_no: i + 1,
          weight: set.weight,
          reps: set.reps,
          planned_reps: ex.planned?.reps ?? '',
          planned_weight: ex.planned?.weight ?? '',
          flag: set.flag || '',
          rpe: set.rpe ?? '',
          note: joinNotes(i === 0 ? ex.note : '', set.note),
          warmup: set.warmup ? 1 : '',
        })
      })
    }
  }
  return rows
}

// Строки-объекты → текст CSV (с BOM и заголовком).
export function rowsToCSV(rows) {
  const lines = [CSV_COLUMNS.join(',')]
  for (const row of rows) {
    lines.push(CSV_COLUMNS.map((col) => escapeValue(row[col])).join(','))
  }
  // \r\n — стандартный перенос для CSV, Excel его любит.
  return BOM + lines.join('\r\n') + '\r\n'
}

export function sessionsToCSV(sessions) {
  return rowsToCSV(sessionsToRows(sessions))
}

// ---------- Разбор ----------

// Разбивает текст CSV на массив массивов строк.
// Идём посимвольно, потому что внутри кавычек могут быть запятые и переносы.
export function parseCSVText(text) {
  if (text.startsWith(BOM)) text = text.slice(1)

  const result = []
  let row = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]

    if (inQuotes) {
      if (ch === '"') {
        // Две кавычки подряд внутри кавычек — это одна кавычка в значении.
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += ch
      }
      continue
    }

    if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      row.push(field)
      field = ''
    } else if (ch === '\n' || ch === '\r') {
      // \r\n считаем одним переносом.
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      result.push(row)
      row = []
      field = ''
    } else {
      field += ch
    }
  }

  // Последняя строка без переноса в конце файла.
  if (field !== '' || row.length > 0) {
    row.push(field)
    result.push(row)
  }

  // Пустые строки (например, в конце файла) выкидываем.
  return result.filter((r) => !(r.length === 1 && r[0].trim() === ''))
}

// Число или null. Понимаем и запятую как десятичный разделитель —
// на случай, если файл пересохранили в русском Excel.
function toNumber(value) {
  if (value == null) return null
  const s = String(value).trim().replace(',', '.')
  if (s === '') return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

// Текст CSV → массив подходов с правильными типами.
// Бросает ошибку с понятным сообщением, если файл не похож на наш формат.
export function parseWorkoutsCSV(text) {
  const table = parseCSVText(text)
  if (table.length === 0) throw new Error('Файл пустой')

  const header = table[0].map((h) => h.trim())
  const required = ['date', 'exercise_id', 'weight', 'reps']
  const missing = required.filter((col) => !header.includes(col))
  if (missing.length > 0) {
    throw new Error(`Это не файл тренировок: нет колонок ${missing.join(', ')}`)
  }

  // Колонки ищем по имени, а не по позиции — так порядок колонок не важен.
  const idx = Object.fromEntries(header.map((h, i) => [h, i]))
  const get = (cells, col) => (idx[col] == null ? '' : (cells[idx[col]] ?? ''))

  return table.slice(1).map((cells) => ({
    date: get(cells, 'date'),
    cycle: toNumber(get(cells, 'cycle')),
    week: toNumber(get(cells, 'week')),
    day: toNumber(get(cells, 'day')),
    workoutName: get(cells, 'workout_name'),
    exerciseId: get(cells, 'exercise_id'),
    exerciseName: get(cells, 'exercise_name'),
    setNo: toNumber(get(cells, 'set_no')),
    weight: toNumber(get(cells, 'weight')) ?? 0,
    reps: toNumber(get(cells, 'reps')) ?? 0,
    plannedReps: toNumber(get(cells, 'planned_reps')),
    plannedWeight: toNumber(get(cells, 'planned_weight')),
    flag: get(cells, 'flag'),
    rpe: toNumber(get(cells, 'rpe')),
    note: get(cells, 'note'),
    warmup: get(cells, 'warmup') === '1',
  }))
}
