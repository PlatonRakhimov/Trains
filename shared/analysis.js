// Аналитика для десктопа. На вход — строки из parseWorkoutsCSV().
import { summarizeSets, formatSets } from './calc.js'
import { workoutCode } from './schema.js'

// ---------- Фильтр ----------

// Все границы необязательные. Даты сравниваем как строки — для YYYY-MM-DD это работает.
export function filterRows(rows, { dateFrom, dateTo, cycleFrom, cycleTo } = {}) {
  return rows.filter(
    (r) =>
      (!dateFrom || r.date >= dateFrom) &&
      (!dateTo || r.date <= dateTo) &&
      (cycleFrom == null || r.cycle >= cycleFrom) &&
      (cycleTo == null || r.cycle <= cycleTo),
  )
}

// ---------- Группировка ----------

// «Запись» = одно упражнение в одной тренировке (несколько подходов).
// Подходы одной записи склеиваем по дате + циклу + позиции + упражнению.
export function groupEntries(rows) {
  const map = new Map()
  for (const r of rows) {
    const key = [r.date, r.cycle, r.week, r.day, r.exerciseId].join('|')
    let entry = map.get(key)
    if (!entry) {
      entry = {
        date: r.date,
        cycle: r.cycle,
        week: r.week,
        day: r.day,
        workoutName: r.workoutName,
        exerciseId: r.exerciseId,
        exerciseName: r.exerciseName,
        sets: [],
      }
      map.set(key, entry)
    }
    entry.sets.push(r)
  }
  const entries = [...map.values()]
  for (const e of entries) {
    e.sets.sort((a, b) => (a.setNo ?? 0) - (b.setNo ?? 0))
    Object.assign(e, summarizeSets(e.sets))
  }
  return entries.sort((a, b) => a.date.localeCompare(b.date) || (a.cycle ?? 0) - (b.cycle ?? 0))
}

// Список упражнений для выбора. Имя берём из самой свежей записи —
// если упражнение переименовали, в списке будет новое имя.
export function exerciseList(rows) {
  const map = new Map()
  for (const r of rows) {
    const prev = map.get(r.exerciseId)
    if (!prev || r.date >= prev.lastDate) map.set(r.exerciseId, { id: r.exerciseId, name: r.exerciseName, lastDate: r.date })
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'ru'))
}

// Список тренировок-позиций (Н1Д1, Н1Д2…), которые встречаются в данных.
export function workoutList(rows) {
  const map = new Map()
  for (const r of rows) {
    if (r.week == null || r.day == null) continue
    const code = workoutCode(r.week, r.day)
    const prev = map.get(code)
    if (!prev || r.date >= prev.lastDate) {
      map.set(code, { code, week: r.week, day: r.day, name: r.workoutName, lastDate: r.date })
    }
  }
  return [...map.values()].sort((a, b) => a.week - b.week || a.day - b.day)
}

// ---------- Экран «По упражнению» ----------

// История упражнения по датам. position = { week, day } — только эта позиция в цикле
// (например, только Н1Д1), без неё — сквозь все тренировки.
export function exerciseHistory(rows, exerciseId, position = null) {
  return groupEntries(rows).filter(
    (e) =>
      e.exerciseId === exerciseId &&
      e.workSets > 0 &&
      (!position || (e.week === position.week && e.day === position.day)),
  )
}

// ---------- Экран «По тренировке» ----------

// Таблица: строки — упражнения, столбцы — циклы, в ячейке "80: 5/5/4".
export function workoutComparison(rows, week, day) {
  const entries = groupEntries(rows).filter((e) => e.week === week && e.day === day)
  const cycles = [...new Set(entries.map((e) => e.cycle))].sort((a, b) => a - b)

  // Порядок упражнений — как в самой свежей тренировке, старые упражнения в конце.
  const exerciseOrder = []
  for (const e of [...entries].reverse()) {
    if (!exerciseOrder.some((x) => x.id === e.exerciseId)) {
      // Имя — из самой свежей записи.
      exerciseOrder.push({ id: e.exerciseId, name: e.exerciseName })
    }
  }

  const table = exerciseOrder.map((ex) => ({
    exerciseId: ex.id,
    exerciseName: ex.name,
    cells: cycles.map((c) => {
      // Если в цикле тренировку делали дважды — показываем последнюю.
      const found = entries.filter((e) => e.exerciseId === ex.id && e.cycle === c).pop()
      if (!found) return null
      return { text: formatSets(found.sets), date: found.date }
    }),
  }))

  return { cycles, rows: table }
}

// ---------- Экран «Сводка / проблемы» ----------

// Последняя запись упражнения в каждом цикле для данной позиции в программе.
function byCycle(entries) {
  const map = new Map()
  for (const e of entries) map.set(e.cycle, e) // entries отсортированы — останется последняя
  return [...map.values()].sort((a, b) => a.cycle - b.cycle)
}

// Ищем проблемы по каждой паре «позиция в цикле + упражнение»
// (присед в Н1Д1 и присед в Н3Д1 — разные нагрузки, сравнивать их между собой нельзя).
//   noGrowth — рабочий вес не вырос за последние noGrowthCycles циклов.
export function findProblems(rows, { noGrowthCycles = 3 } = {}) {
  const groups = new Map()
  for (const e of groupEntries(rows)) {
    if (e.workSets === 0 || e.week == null) continue
    const key = `${e.week}|${e.day}|${e.exerciseId}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(e)
  }

  const noGrowth = []

  for (const list of groups.values()) {
    const history = byCycle(list)
    const last = history[history.length - 1]
    const base = {
      exerciseId: last.exerciseId,
      exerciseName: last.exerciseName,
      week: last.week,
      day: last.day,
      code: workoutCode(last.week, last.day),
    }

    // Нужно noGrowthCycles циклов: первый — точка отсчёта, дальше вес не превысил её.
    // Упражнения без веса (планка, подтягивания с весом 0) пропускаем — там прогресс в повторах.
    if (history.length >= noGrowthCycles && last.maxWeight > 0) {
      const window = history.slice(-noGrowthCycles)
      const start = window[0].maxWeight
      if (window.every((e) => e.maxWeight <= start)) {
        noGrowth.push({ ...base, cycles: window.map((e) => e.cycle), weight: last.maxWeight })
      }
    }
  }

  const order = (x, y) => x.week - y.week || x.day - y.day || x.exerciseName.localeCompare(y.exerciseName, 'ru')
  return { noGrowth: noGrowth.sort(order) }
}
