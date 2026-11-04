// Порядок тренировок в цикле: какая следующая и какой номер цикла.
// Считаем по порядку записанных тренировок, а НЕ по датам —
// пропущенная неделя отпуска не должна сбивать счёт.

// Найти позицию тренировки в текущей программе.
// Сначала ищем по id (программу могли переставить), потом по номерам из записи.
export function findPosition(program, session) {
  for (let w = 0; w < program.weeks.length; w++) {
    const d = program.weeks[w].workouts.findIndex((wo) => wo.id === session.workoutId)
    if (d !== -1) return { weekIndex: w, dayIndex: d }
  }
  const w = (session.weekNo ?? 0) - 1
  const d = (session.dayNo ?? 0) - 1
  if (program.weeks[w]?.workouts[d]) return { weekIndex: w, dayIndex: d }
  return null
}

// Позиция, идущая после данной. wrapped = true, если перешли в новый цикл.
// Недели без тренировок пропускаем.
export function positionAfter(program, { weekIndex, dayIndex }) {
  const weeks = program.weeks
  let w = weekIndex
  let d = dayIndex + 1
  let wrapped = false

  // Не больше одного полного круга, чтобы не зациклиться на пустой программе.
  for (let step = 0; step <= weeks.length; step++) {
    if (weeks[w] && d < weeks[w].workouts.length) return { weekIndex: w, dayIndex: d, wrapped }
    w++
    d = 0
    if (w >= weeks.length) {
      w = 0
      wrapped = true
    }
  }
  return null
}

// Первая тренировка программы (для самого первого запуска).
function firstPosition(program) {
  const w = program.weeks.findIndex((week) => week.workouts.length > 0)
  return w === -1 ? null : { weekIndex: w, dayIndex: 0 }
}

// Последняя записанная тренировка. Лог хранится в порядке создания,
// поэтому «последняя» — это последняя в массиве, а не с самой поздней датой
// (дату могли поправить задним числом).
export function lastSession(sessions) {
  return sessions.length > 0 ? sessions[sessions.length - 1] : null
}

// Что предложить на главном экране.
// Возвращает { weekIndex, dayIndex, cycle } или null, если программа пустая.
export function suggestNext(program, sessions) {
  const last = lastSession(sessions)

  if (!last) {
    const first = firstPosition(program)
    return first && { ...first, cycle: 1 }
  }

  const pos = findPosition(program, last)
  // Тренировку из записи удалили из программы — начинаем цикл заново со следующего номера.
  if (!pos) {
    const first = firstPosition(program)
    return first && { ...first, cycle: (last.cycle ?? 0) + 1 }
  }

  const next = positionAfter(program, pos)
  if (!next) return null
  // Номер цикла берём из последней записи: если его поправили вручную,
  // дальше счёт пойдёт от исправленного значения.
  const cycle = (last.cycle ?? 1) + (next.wrapped ? 1 : 0)
  return { weekIndex: next.weekIndex, dayIndex: next.dayIndex, cycle }
}

// Номер цикла для тренировки, выбранной вручную.
// Если выбранная тренировка в цикле не раньше последней записанной — тот же цикл,
// иначе (вернулись к началу программы) — следующий.
export function cycleForManualPick(program, sessions, weekIndex, dayIndex) {
  const last = lastSession(sessions)
  if (!last) return 1
  const pos = findPosition(program, last)
  const lastCycle = last.cycle ?? 1
  if (!pos) return lastCycle + 1
  const isLater =
    weekIndex > pos.weekIndex || (weekIndex === pos.weekIndex && dayIndex > pos.dayIndex)
  return isLater ? lastCycle : lastCycle + 1
}

// Та же тренировка (та же позиция в программе) в прошлом цикле — для подсказки «в прошлый раз».
// Ищем с конца лога: самую свежую запись этой тренировки из более раннего цикла.
export function previousSameWorkout(sessions, { workoutId, weekNo, dayNo, cycle }, excludeId = null) {
  for (let i = sessions.length - 1; i >= 0; i--) {
    const s = sessions[i]
    if (s.id === excludeId) continue
    if (cycle != null && s.cycle != null && s.cycle >= cycle) continue
    const same = workoutId && s.workoutId ? s.workoutId === workoutId : s.weekNo === weekNo && s.dayNo === dayNo
    if (same) return s
  }
  return null
}

// Последний раз, когда делали это упражнение (в любой тренировке) — для предзаполнения веса.
export function lastSetsOfExercise(sessions, exerciseId, excludeId = null) {
  for (let i = sessions.length - 1; i >= 0; i--) {
    const s = sessions[i]
    if (s.id === excludeId) continue
    const ex = s.exercises.find((e) => e.exerciseId === exerciseId && e.sets.length > 0)
    if (ex) return ex.sets
  }
  return null
}
