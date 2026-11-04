// Работа с датами в формате YYYY-MM-DD.
// Важно: берём МЕСТНУЮ дату. new Date().toISOString() даёт дату по UTC,
// и поздно вечером в Москве она уже будет «завтрашней».

function pad(n) {
  return String(n).padStart(2, '0')
}

export function toISODate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function todayISO() {
  return toISODate(new Date())
}

export function isISODate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

// Сколько полных дней прошло от момента from (Date, строка или число) до now.
export function daysSince(from, now = new Date()) {
  const ms = new Date(now).getTime() - new Date(from).getTime()
  return Math.floor(ms / (24 * 60 * 60 * 1000))
}

// "2026-11-04" → Date в МЕСТНОМ времени (new Date("2026-11-04") дал бы полночь по UTC).
export function parseISODate(value) {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// "2026-11-04" → "4 нояб." (или "4 нояб. 2026 г." с годом)
export function formatDateRu(value, withYear = false) {
  if (!isISODate(value)) return value || ''
  const options = { day: 'numeric', month: 'short' }
  if (withYear) options.year = 'numeric'
  return parseISODate(value).toLocaleDateString('ru-RU', options)
}
