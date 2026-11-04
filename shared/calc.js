// Расчёты по подходам. Функции принимают простой массив подходов вида
// { weight, reps, warmup } — так их можно использовать и с записями телефона,
// и со строками CSV на десктопе.

// Расчётный 1ПМ по формуле Эпли.
export function epley1RM(weight, reps) {
  if (!(weight > 0) || !(reps > 0)) return 0
  return weight * (1 + reps / 30)
}

// Рабочий подход = не разминка.
export function isWorkSet(set) {
  return !set.warmup
}

// Сводка по подходам одного упражнения за одну тренировку (только рабочие подходы).
export function summarizeSets(sets) {
  const work = sets.filter(isWorkSet)
  let maxWeight = 0
  let best1RM = 0
  let volume = 0
  for (const s of work) {
    maxWeight = Math.max(maxWeight, s.weight || 0)
    best1RM = Math.max(best1RM, epley1RM(s.weight, s.reps))
    volume += (s.weight || 0) * (s.reps || 0)
  }
  return { maxWeight, best1RM, volume, workSets: work.length }
}

// Округление для показа: 102.66666 → 102.7
export function round1(n) {
  return Math.round(n * 10) / 10
}

// Компактная запись подходов: "80: 5/5/4".
// Если вес менялся — группы через запятую: "80: 5/5, 85: 3".
// Разминка не показывается.
export function formatSets(sets, weightSeparator = ': ') {
  const groups = []
  for (const s of sets.filter(isWorkSet)) {
    const last = groups[groups.length - 1]
    if (last && last.weight === s.weight) last.reps.push(s.reps)
    else groups.push({ weight: s.weight, reps: [s.reps] })
  }
  // Без веса (планка, подтягивания) — только повторы: "8/8/7".
  return groups.map((g) => (g.weight ? `${g.weight}${weightSeparator}` : '') + g.reps.join('/')).join(', ')
}

// Число для показа: десятичная точка (как в поле ввода на телефоне), до 0.1,
// большие числа — с пробелом между тысячами: 2 090.
export function formatNumber(n) {
  if (n == null || !Number.isFinite(n)) return ''
  const r = round1(n)
  if (Math.abs(r) < 1000) return String(r)
  const [int, frac] = String(r).split('.')
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0') + (frac ? '.' + frac : '')
}
