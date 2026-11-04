// Запоминаем последний загруженный CSV в localStorage, чтобы не выбирать файл каждый раз.
// Объём небольшой: ~100 байт на подход, 4000 подходов в год ≈ 0,4 МБ. Лимит браузера ~5 МБ.

const KEY = 'trains.desktop.lastFile'

export function loadSavedFile() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null // { name, text, loadedAt }
  } catch {
    return null
  }
}

// Возвращает true, если удалось сохранить.
export function saveFile(name, text) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ name, text, loadedAt: new Date().toISOString() }))
    return true
  } catch {
    // Переполнено или запрещено (приватный режим) — просто не запоминаем.
    return false
  }
}

export function forgetFile() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ничего
  }
}

// Мелкие настройки интерфейса (выбранная вкладка, упражнение…) — тоже в localStorage.
export function loadPref(name, fallback) {
  try {
    const raw = localStorage.getItem('trains.desktop.' + name)
    return raw == null ? fallback : JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function savePref(name, value) {
  try {
    localStorage.setItem('trains.desktop.' + name, JSON.stringify(value))
  } catch {
    // ничего
  }
}
