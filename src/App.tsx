
import { useEffect, useState } from 'react'
import { bibleBooks } from './bibleData'
import './App.css'
import JosuaAdventure from './JosuaAdventure'
import JosuaUnlock from './JosuaUnlock'
import AdventureBadges from './AdventureBadges'

type Reading = {
  bookId: string
  chapter: number
  start: number
  end: number
}

const STORAGE_KEY = 'dailyquest-readings-v2'
const HISTORICAL_BOOKS_KEY = 'dailyquest-historical-books'
const XP_STORAGE_KEY = 'dailyquest-xp'
const READING_DAYS_KEY = 'dailyquest-reading-days'
const CHAPTER_REWARDS_KEY = 'dailyquest-chapter-rewards'
const BOOK_REWARDS_KEY = 'dailyquest-book-rewards'
const XP_HISTORY_KEY = 'dailyquest-xp-history'

type XpEntry = {
  id: string
  date: string
  description: string
  amount: number
}
const achievements = [
  {
    id: 'first-book',
    title: 'Der erste Schritt',
    description: 'Ein Bibelbuch vollständig gelesen',
    required: 1,
  },
  {
    id: 'five-books',
    title: 'Auf Entdeckungsreise',
    description: '5 Bibelbücher vollständig gelesen',
    required: 5,
  },
  {
    id: 'ten-books',
    title: 'Bibelentdecker',
    description: '10 Bibelbücher vollständig gelesen',
    required: 10,
  },
  {
    id: 'twenty-books',
    title: 'Wissenssammler',
    description: '20 Bibelbücher vollständig gelesen',
    required: 20,
  },
  {
    id: 'all-books',
    title: 'Die ganze Bibel',
    description: 'Alle 66 Bibelbücher vollständig gelesen',
    required: 66,
  },
]
const OLD_STORAGE_KEY = 'dailyquest-readings'

// Bisherige Josua-Leseeinheiten einmalig übernehmen
function loadReadings(): Reading[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)

    if (saved !== null) {
      return JSON.parse(saved) as Reading[]
    }

    const old = JSON.parse(
      localStorage.getItem(OLD_STORAGE_KEY) || '[]'
    ) as Omit<Reading, 'bookId'>[]

    const migrated = old.map(reading => ({
      ...reading,
      bookId: 'jos',
    }))

    localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated))
    return migrated
  } catch {
    return []
  }
}

function getReadVerses(
  readings: Reading[],
  bookId: string,
  chapter: number,
  maxVerses: number
): Set<number> {
  const verses = new Set<number>()

  readings
    .filter(r => r.bookId === bookId && r.chapter === chapter)
    .forEach(r => {
      for (let v = r.start; v <= r.end; v++) {
        if (v >= 1 && v <= maxVerses) {
          verses.add(v)
        }
      }
    })

  return verses
}

function getNextUnread(
  readings: Reading[],
  bookId: string,
  chapter: number,
  maxVerses: number
): number | undefined {
  const read = getReadVerses(
    readings, bookId, chapter, maxVerses
  )

  return Array.from(
    { length: maxVerses },
    (_, i) => i + 1
  ).find(v => !read.has(v))
}

function App() {
  const [readings, setReadings] = useState<Reading[]>(loadReadings)
  const [showJosuaUnlock, setShowJosuaUnlock] = useState(false)
  const [xp, setXp] = useState<number>(() => {
  try {
    return Number(localStorage.getItem(XP_STORAGE_KEY) || '0')
  } catch {
    return 0
  }
})

const [readingDays, setReadingDays] = useState<string[]>(() => {
  try {
    return JSON.parse(
      localStorage.getItem(READING_DAYS_KEY) || '[]'
    )
  } catch {
    return []
  }
})
const [rewardedChapters, setRewardedChapters] = useState<string[]>(() => {
  try {
    return JSON.parse(
      localStorage.getItem(CHAPTER_REWARDS_KEY) || '[]'
    )
  } catch {
    return []
  }
})
  const [historicalBooks, setHistoricalBooks] = useState<string[]>(() => {
  try {
    return JSON.parse(
      localStorage.getItem(HISTORICAL_BOOKS_KEY) || '[]'
    )
  } catch {
    return []
  }
})

const [rewardedBooks, setRewardedBooks] = useState<string[]>(() => {
  try {
    return JSON.parse(
      localStorage.getItem(BOOK_REWARDS_KEY) || '[]'
    )
  } catch {
    return []
  }
})
const [xpHistory, setXpHistory] = useState<XpEntry[]>(() => {
  try {
    return JSON.parse(
      localStorage.getItem(XP_HISTORY_KEY) || '[]'
    )
  } catch {
    return []
  }
})
function toggleHistoricalBook(id: string) {
  const updated = historicalBooks.includes(id)
    ? historicalBooks.filter(bookId => bookId !== id)
    : [...historicalBooks, id]

  setHistoricalBooks(updated)

  localStorage.setItem(
    HISTORICAL_BOOKS_KEY,
    JSON.stringify(updated)
  )
}

  const [bookId, setBookId] = useState('jos')
  const [chapter, setChapter] = useState(6)
  const [start, setStart] = useState(1)
  const [end, setEnd] = useState(10)

const [page, setPage] = useState<
 'home' | 'reading' | 'history' | 'profile' | 'adventure' | 'adventure-map'
>('home')

const [showAllRanks, setShowAllRanks] = useState(false)

const [userName, setUserName] = useState(() => {
  return localStorage.getItem('dailyquest-user-name') || 'Leon'
})

const [isEditingName, setIsEditingName] = useState(false)

function saveUserName(name: string) {
  const cleanName = name.trim()

  if (!cleanName) return

  setUserName(cleanName)
  localStorage.setItem('dailyquest-user-name', cleanName)
  setIsEditingName(false)
}


const [currentHour, setCurrentHour] = useState(
  () => new Date().getHours()
)

useEffect(() => {
  const interval = window.setInterval(() => {
    setCurrentHour(new Date().getHours())
  }, 60000)

  return () => window.clearInterval(interval)
}, [])

const timeOfDay = 
  currentHour >= 6 && currentHour < 11
    ? 'morning'
    : currentHour >= 11 && currentHour < 17
      ? 'day'
      : currentHour >= 17 && currentHour < 22
        ? 'evening'
        : 'night'


const greeting =
  timeOfDay === 'morning'
    ? `Guten Morgen, ${userName}! ☀️`
    : timeOfDay === 'day'
      ? `Guten Tag, ${userName}! 🌿`
      : timeOfDay === 'evening'
        ? `Guten Abend, ${userName}! 🌅`
        : `Gute Nacht, ${userName}! 🌙`


const greetingSubtitle =
  timeOfDay === 'morning'
    ? 'Ein neuer Tag, ein neues Kapitel.'
    : timeOfDay === 'day'
      ? 'Zeit für eine kleine Lesepause.'
      : timeOfDay === 'evening'
        ? 'Lass den Tag in Ruhe ausklingen.'
        : 'Ein ruhiger Moment zum Nachdenken.'

  const [message, setMessage] = useState('')
  
  // Leseserie berechnen
  const sortedReadingDays = [...new Set(readingDays)].sort()

  const toDayNumber = (date: string) => {
    const [year, month, day] = date.split('-').map(Number)
    return Math.floor(
      Date.UTC(year, month - 1, day) / 86400000
    )
  }

  const todayDate = new Date()

  const todayKey = [
    todayDate.getFullYear(),
    String(todayDate.getMonth() + 1).padStart(2, '0'),
    String(todayDate.getDate()).padStart(2, '0'),
  ].join('-')

  const todayNumber = toDayNumber(todayKey)

  let currentStreak = 0
  let longestStreak = 0
  let runningStreak = 0
  let previousDayNumber: number | null = null

  for (const date of sortedReadingDays) {
    const dayNumber = toDayNumber(date)

    if (
      previousDayNumber !== null &&
      dayNumber === previousDayNumber + 1
    ) {
      runningStreak += 1
    } else {
      runningStreak = 1
    }

    longestStreak = Math.max(longestStreak, runningStreak)
    previousDayNumber = dayNumber
  }

  if (previousDayNumber !== null) {
    const daysSinceLastReading =
      todayNumber - previousDayNumber

    if (daysSinceLastReading <= 1) {
      currentStreak = runningStreak
    }
  }

  // Die aktuelle Woche von Montag bis Sonntag
  const weekStart = new Date()
  const weekday = (weekStart.getDay() + 6) % 7

  weekStart.setDate(weekStart.getDate() - weekday)
  weekStart.setHours(12, 0, 0, 0)

  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart)
    date.setDate(weekStart.getDate() + index)

    const dateKey = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('-')

    return {
      label: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'][index],
      date: dateKey,
      completed: readingDays.includes(dateKey),
      isToday: dateKey === todayKey,
    }
  })

const level = Math.floor(xp / 100) + 1

const levelRanks = [
  { minLevel: 1, name: 'Entdecker', icon: '🌱' },
  { minLevel: 5, name: 'Wegbereiter', icon: '🧭' },
  { minLevel: 10, name: 'Bibelforscher', icon: '📖' },
  { minLevel: 20, name: 'Gipfelstürmer', icon: '🏔️' },
  { minLevel: 30, name: 'Schatzsucher', icon: '💎' },
  { minLevel: 50, name: 'Weisheitssammler', icon: '🕊️' },
  { minLevel: 75, name: 'Schriftgelehrter', icon: '🌟' },
  { minLevel: 100, name: 'Meister der Schriften', icon: '👑' },
]

const currentRank = [...levelRanks]
  .reverse()
  .find(rank => level >= rank.minLevel)!

const nextRank = levelRanks.find(
  rank => rank.minLevel > level
)

const currentLevelXp = xp % 100
const levelProgress = currentLevelXp
  const selectedBook = bibleBooks.find(
    book => book.id === bookId
  ) ?? bibleBooks[0]

  const totalVerses = selectedBook.verses[chapter - 1]

  const readCount = getReadVerses(
    readings, bookId, chapter, totalVerses
  ).size

  const progress = Math.round(
    (readCount / totalVerses) * 100
  )

  const totalBibleVerses = bibleBooks.reduce(
    (sum, book) =>
      sum + book.verses.reduce((a, b) => a + b, 0),
    0
  )

const totalRead = bibleBooks.reduce((sum, book) => {
  // Historisch abgeschlossene Bücher zählen vollständig.
  if (historicalBooks.includes(book.id)) {
    return sum + book.verses.reduce(
      (chapterSum, verseCount) => chapterSum + verseCount,
      0
    )
  }

  // Andere Bücher zählen nur mit tatsächlich erfassten Versen.
  return sum + book.verses.reduce(
    (chapterSum, verseCount, index) =>
      chapterSum + getReadVerses(
        readings, book.id, index + 1, verseCount
      ).size,
    0
  )
}, 0)

  const bibleProgress = (
    (totalRead / totalBibleVerses) * 100
  ).toFixed(2)
const completedBooks = bibleBooks.filter(book => {
  if (historicalBooks.includes(book.id)) {
    return true
  }

  return book.verses.every((verseCount, index) =>
    getReadVerses(
      readings,
      book.id,
      index + 1,
      verseCount
    ).size === verseCount
  )
}).length
const unlockedAchievements = achievements.filter(
  achievement => completedBooks >= achievement.required
)
 
function selectChapter(nextBookId: string, nextChapter: number) {
  const book = bibleBooks.find(b => b.id === nextBookId)
  if (!book) return

  const maxVerses = book.verses[nextChapter - 1]
  if (!maxVerses) return



  const next = getNextUnread(
    readings, nextBookId, nextChapter, maxVerses
  )

  setBookId(nextBookId)
  setChapter(nextChapter)
  setStart(next ?? 1)
  setEnd(maxVerses)
  setMessage('')
}



function saveReading() {
  if (
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < 1 ||
    end > totalVerses ||
    start > end
  ) {
    setMessage('Bitte wähle einen gültigen Versbereich.')
    return
  }

  const existing = getReadVerses(
    readings, bookId, chapter, totalVerses
  )

  const newVerses = Array.from(
    { length: end - start + 1 },
    (_, i) => start + i
  ).filter(v => !existing.has(v))

  if (newVerses.length === 0) {
    setMessage('Dieser Versbereich wurde bereits gelesen.')
    return
  }

  const updated = [
    ...readings,
    { bookId, chapter, start, end },
  ]

  const now = new Date()
  const today = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-')

  const newEntries: XpEntry[] = []

  // 10 XP für den ersten Lesefortschritt des Tages
  if (!readingDays.includes(today)) {
    const updatedDays = [...readingDays, today]

    setReadingDays(updatedDays)
    localStorage.setItem(
      READING_DAYS_KEY,
      JSON.stringify(updatedDays)
    )

    newEntries.push({
      id: `${today}-daily`,
      date: today,
      description: 'Tägliches Bibellesen',
      amount: 10,
    })
  }

  // 20 XP für einen erstmaligen Kapitelabschluss
  const chapterKey = `${bookId}-${chapter}`

  const wasComplete =
    existing.size === totalVerses

  const isComplete =
    getReadVerses(updated, bookId, chapter, totalVerses).size
    === totalVerses

  if (
    !wasComplete &&
    isComplete &&
    !rewardedChapters.includes(chapterKey)
  ) {
    const updatedRewards = [...rewardedChapters, chapterKey]

    setRewardedChapters(updatedRewards)
    localStorage.setItem(
      CHAPTER_REWARDS_KEY,
      JSON.stringify(updatedRewards)
    )

    newEntries.push({
      id: `${chapterKey}-chapter`,
      date: today,
      description: `${selectedBook.name} ${chapter} abgeschlossen`,
      amount: 20,
    })
  }

  // 100 XP für einen erstmaligen aktiven Buchabschluss
  const wasBookComplete = selectedBook.verses.every(
    (verseCount, index) =>
      getReadVerses(
        readings, bookId, index + 1, verseCount
      ).size === verseCount
  )

  const isBookComplete = selectedBook.verses.every(
    (verseCount, index) =>
      getReadVerses(
        updated, bookId, index + 1, verseCount
      ).size === verseCount
  )

  if (
    !wasBookComplete &&
    isBookComplete &&
    !rewardedBooks.includes(bookId)
  ) {
    const updatedRewards = [...rewardedBooks, bookId]

    setRewardedBooks(updatedRewards)
    localStorage.setItem(
      BOOK_REWARDS_KEY,
      JSON.stringify(updatedRewards)
    )

    newEntries.push({
      id: `${bookId}-book`,
      date: today,
      description: `${selectedBook.name} vollständig gelesen`,
      amount: 100,
    })
  }

    // 150 Bonus-XP für das Josua-Abenteuer
    if (
      bookId === 'jos' &&
      !wasBookComplete &&
      isBookComplete &&
      !xpHistory.some(entry => entry.id === 'jos-adventure')
    ) {
      newEntries.push({
        id: 'jos-adventure',
        date: today,
        description: 'Abzeichen: Eroberer von Kanaan 🏆',
        amount: 150,
      })

setShowJosuaUnlock(true)

    }

  // Alle XP gemeinsam berechnen
  const earnedXp = newEntries.reduce(
    (sum, entry) => sum + entry.amount,
    0
  )

  const updatedXp = xp + earnedXp
  const updatedHistory = [...newEntries, ...xpHistory]

  // Fortschritt und Belohnungen speichern
  setReadings(updated)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))

  setXp(updatedXp)
  localStorage.setItem(XP_STORAGE_KEY, String(updatedXp))

  setXpHistory(updatedHistory)
  localStorage.setItem(
    XP_HISTORY_KEY,
    JSON.stringify(updatedHistory)
  )

  // Nächsten ungelesenen Vers vorschlagen
  const next = getNextUnread(
    updated, bookId, chapter, totalVerses
  )

  const rewardMessage =
    earnedXp > 0 ? ` +${earnedXp} XP!` : ''

  if (next === undefined) {
    setMessage(
      `${selectedBook.name} ${chapter} vollständig gelesen! 🎉` +
      rewardMessage
    )
  } else {
    setStart(next)
    setEnd(totalVerses)
    setMessage(
      `${selectedBook.name} ${chapter}:${start}–${end} gespeichert!` +
      rewardMessage +
      ` Weiter geht es ab Vers ${next}.`
    )
  }
}

function exportBackup() {
  const backup = {
    app: 'DailyQuest',
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {} as Record<string, string>
  }

  // Alle DailyQuest-Daten aus dem Browserspeicher sichern
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)

    if (key && key.startsWith('dailyquest-')) {
      const value = localStorage.getItem(key)

      if (value !== null) {
        backup.data[key] = value
      }
    }
  }

  const json = JSON.stringify(backup, null, 2)
  const blob = new Blob([json], {
    type: 'application/json'
  })

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download =
    `DailyQuest-Backup-${new Date().toISOString().slice(0, 10)}.json`

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}

async function importBackup(
  event: React.ChangeEvent<HTMLInputElement>
) {
  const input = event.currentTarget
  const file = input.files?.[0]

  if (!file) return

  try {
    if (!file.name.toLowerCase().endsWith('.json')) {
      throw new Error('Bitte wähle eine JSON-Datei aus.')
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new Error('Die Sicherungsdatei ist zu groß.')
    }

    const content = await file.text()
    const backup: unknown = JSON.parse(content)

    if (
      typeof backup !== 'object' ||
      backup === null ||
      !('app' in backup) ||
      backup.app !== 'DailyQuest' ||
      !('version' in backup) ||
      backup.version !== 1 ||
      !('data' in backup) ||
      typeof backup.data !== 'object' ||
      backup.data === null ||
      Array.isArray(backup.data)
    ) {
      throw new Error('Keine gültige DailyQuest-Sicherung.')
    }

    const data = backup.data as Record<string, unknown>
    const entries = Object.entries(data)

    if (
      entries.length === 0 ||
      !entries.every(
        ([key, value]) =>
          key.startsWith('dailyquest-') &&
          typeof value === 'string'
      )
    ) {
      throw new Error('Die Sicherung enthält ungültige Daten.')
    }

    const confirmed = window.confirm(
      'Möchtest du diese Sicherung wiederherstellen?\n\n' +
      'Deine bisherigen DailyQuest-Daten auf diesem Gerät ' +
      'werden dadurch ersetzt.\n\n' +
      'Erstelle vorher am besten eine eigene Sicherung.'
    )

    if (!confirmed) return

    // Vorhandene DailyQuest-Daten sichern,
    // falls beim Schreiben ein Fehler auftritt.
    const previousData: Record<string, string> = {}

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)

      if (key?.startsWith('dailyquest-')) {
        const value = localStorage.getItem(key)
        if (value !== null) previousData[key] = value
      }
    }

    try {
      Object.keys(previousData).forEach(key => {
        localStorage.removeItem(key)
      })

      entries.forEach(([key, value]) => {
        localStorage.setItem(key, value as string)
      })
    } catch {
      // Vorherige Daten bei einem Speicherfehler zurückholen
      Object.keys(data).forEach(key => {
        if (key.startsWith('dailyquest-')) {
          localStorage.removeItem(key)
        }
      })

      Object.entries(previousData).forEach(([key, value]) => {
        localStorage.setItem(key, value)
      })

      throw new Error(
        'Die Wiederherstellung ist fehlgeschlagen.'
      )
    }

    window.alert(
      'Deine DailyQuest-Sicherung wurde wiederhergestellt!'
    )

    window.location.reload()
  } catch (error) {
    window.alert(
      error instanceof Error
        ? error.message
        : 'Die Sicherungsdatei konnte nicht gelesen werden.'
    )
  } finally {
    input.value = ''
  }
}

function deleteReading(readingToDelete: Reading) {
  const confirmed = window.confirm(
    `Möchtest du den Versbereich ${readingToDelete.chapter}:${readingToDelete.start}–${readingToDelete.end} wirklich löschen?`
  )

  if (!confirmed) return

  const index = readings.indexOf(readingToDelete)
  if (index === -1) return

  const updated = readings.filter((_, i) => i !== index)

  const book = bibleBooks.find(
    b => b.id === readingToDelete.bookId
  )

  if (!book) return

  const chapterKey =
    `${readingToDelete.bookId}-${readingToDelete.chapter}`

  const maxVerses = book.verses[readingToDelete.chapter - 1]

  // Prüfen, ob das Kapitel vor dem Löschen vollständig war
  const chapterWasComplete =
    getReadVerses(
      readings,
      readingToDelete.bookId,
      readingToDelete.chapter,
      maxVerses
    ).size === maxVerses

  // Prüfen, ob es nach dem Löschen noch vollständig ist
  const chapterIsComplete =
    getReadVerses(
      updated,
      readingToDelete.bookId,
      readingToDelete.chapter,
      maxVerses
    ).size === maxVerses

  // Prüfen, ob das gesamte Bibelbuch vorher vollständig war
  const bookWasComplete = book.verses.every(
    (verseCount, chapterIndex) =>
      getReadVerses(
        readings,
        book.id,
        chapterIndex + 1,
        verseCount
      ).size === verseCount
  )

  // Prüfen, ob das Bibelbuch weiterhin vollständig ist
  const bookIsComplete = book.verses.every(
    (verseCount, chapterIndex) =>
      getReadVerses(
        updated,
        book.id,
        chapterIndex + 1,
        verseCount
      ).size === verseCount
  )

  let xpToRemove = 0
  const removedRewardIds: string[] = []

  // Kapitelbelohnung zurücknehmen
  if (
    chapterWasComplete &&
    !chapterIsComplete &&
    rewardedChapters.includes(chapterKey)
  ) {
    xpToRemove += 20
    removedRewardIds.push(`${chapterKey}-chapter`)
  }

  // Buchbelohnung zurücknehmen
  if (
    bookWasComplete &&
    !bookIsComplete &&
    rewardedBooks.includes(book.id)
  ) {
    xpToRemove += 100
    removedRewardIds.push(`${book.id}-book`)
  }

    // Josua-Abenteuerbonus zurücknehmen
    if (
      book.id === 'jos' &&
      bookWasComplete &&
      !bookIsComplete &&
      xpHistory.some(entry => entry.id === 'jos-adventure')
    ) {
      xpToRemove += 150
      removedRewardIds.push('jos-adventure')
    }

  // Fortschritt speichern
  setReadings(updated)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))

  // XP und Belohnungshistorie aktualisieren
  if (xpToRemove > 0) {
    const updatedXp = Math.max(0, xp - xpToRemove)

    setXp(updatedXp)
    localStorage.setItem(XP_STORAGE_KEY, String(updatedXp))

    const updatedHistory = xpHistory.filter(
      entry => !removedRewardIds.includes(entry.id)
    )

    setXpHistory(updatedHistory)
    localStorage.setItem(
      XP_HISTORY_KEY,
      JSON.stringify(updatedHistory)
    )

    const updatedChapters = rewardedChapters.filter(
      key => key !== chapterKey ||
        !removedRewardIds.includes(`${key}-chapter`)
    )

    setRewardedChapters(updatedChapters)
    localStorage.setItem(
      CHAPTER_REWARDS_KEY,
      JSON.stringify(updatedChapters)
    )

    const updatedBooks = rewardedBooks.filter(
      id => !removedRewardIds.includes(`${id}-book`)
    )

    setRewardedBooks(updatedBooks)
    localStorage.setItem(
      BOOK_REWARDS_KEY,
      JSON.stringify(updatedBooks)
    )
  }

  setMessage(
    xpToRemove > 0
      ? `Versbereich gelöscht. −${xpToRemove} XP korrigiert.`
      : 'Versbereich gelöscht. Dein Fortschritt wurde aktualisiert.'
  )
}

  // Fortschritt für die Josua-Abenteuerkarte
  const josuaBook = bibleBooks.find(book => book.id === 'jos')

  const josuaCompletedChapters = (josuaBook?.verses ?? []).map(
    (verseCount, index) =>
      historicalBooks.includes('jos') ||
      getReadVerses(
        readings,
        'jos',
        index + 1,
        verseCount
      ).size === verseCount
  )
const josuaBadgeUnlocked =
  josuaCompletedChapters.length === 24 &&
  josuaCompletedChapters.every(Boolean)
const chapterReadings = readings.filter(
  r => r.bookId === bookId && r.chapter === chapter
)

  return (
    <main className={`dashboard dashboard-${timeOfDay}`}>
      

      <header className="header">
        <div
          className="logo"
          onClick={() => setPage('home')}
        >
          ✦ DailyQuest
        </div>
        <span className="level">
  {currentRank.icon} Level {level} · {currentRank.name}
</span>
      </header>

      
{page === 'home' ? (
  <div className="home-mobile">
    



    {/* Berglandschaft und Begrüßung */}
    <section className={`home-hero ${timeOfDay}`}>
      
<svg
  className="home-hero-landscape"
  viewBox="0 0 390 190"
  preserveAspectRatio="xMidYMid slice"
  aria-hidden="true"
>
  <defs>
    <linearGradient
      id="dynamic-sky"
      x1="0"
      y1="0"
      x2="0"
      y2="1"
    >
      <stop
        offset="0%"
        stopColor={
          timeOfDay === 'morning' ? '#b9e5f2' :
          timeOfDay === 'day' ? '#c6e9e8' :
          timeOfDay === 'evening' ? '#e8b9bd' :
          '#243d5a'
        }
      />
      <stop
        offset="100%"
        stopColor={
          timeOfDay === 'morning' ? '#fff2c9' :
          timeOfDay === 'day' ? '#eff8e8' :
          timeOfDay === 'evening' ? '#fbd8a8' :
          '#405c77'
        }
      />
    </linearGradient>
  </defs>

  <rect
    width="390"
    height="190"
    fill="url(#dynamic-sky)"
  />

  {timeOfDay === 'night' ? (
    <>
      <circle cx="320" cy="48" r="19" fill="#f4eecf" />
      <circle cx="329" cy="40" r="19" fill="#243d5a" />

      {[
        [35, 30],
        [85, 55],
        [140, 22],
        [205, 47],
        [270, 20],
        [365, 72],
        [175, 76],
      ].map(([x, y], index) => (
        <circle
          key={index}
          cx={x}
          cy={y}
          r="1.6"
          fill="#fff6d9"
        />
      ))}
    </>
  ) : (
    <circle
      cx={timeOfDay === 'evening' ? 315 : 320}
      cy={timeOfDay === 'evening' ? 105 : 45}
      r={timeOfDay === 'evening' ? 28 : 25}
      fill={
        timeOfDay === 'morning' ? '#ffe49a' :
        timeOfDay === 'day' ? '#fff0b3' :
        '#f6b579'
      }
    />
  )}

  <path
    d="M0 128 C75 85 110 96 175 120 S290 75 390 110 L390 190 L0 190Z"
    fill={
      timeOfDay === 'morning' ? '#b4d9c7' :
      timeOfDay === 'day' ? '#b0d8c1' :
      timeOfDay === 'evening' ? '#c9ada7' :
      '#496b79'
    }
  />

  <path
    d="M0 150 C90 115 140 142 210 125 S320 118 390 140 L390 190 L0 190Z"
    fill={
      timeOfDay === 'morning' ? '#91c5b3' :
      timeOfDay === 'day' ? '#86c5ad' :
      timeOfDay === 'evening' ? '#aaa6a3' :
      '#3c6673'
    }
  />

  <path
    d="M0 173 C95 143 160 170 240 150 S340 155 390 162 L390 190 L0 190Z"
    fill={
      timeOfDay === 'morning' ? '#5d9f96' :
      timeOfDay === 'day' ? '#55a58f' :
      timeOfDay === 'evening' ? '#8e9f9b' :
      '#315a67'
    }
  />
</svg>


      <div className="home-hero-content">
<span>DEINE TÄGLICHE REISE DURCH DIE BIBEL</span>
<h1>{greeting}</h1>
<p>{greetingSubtitle}</p>
      </div>
    </section>

    {/* Wichtigste Aktion */}
    <section className="home-reading-card">
      <div className="home-section-heading">
        <span>📖</span>
        <h2>Deine nächste Leseeinheit</h2>
      </div>
      <p>Setze deine persönliche Bibellese fort.</p>
      <button
        className="home-primary-button"
        onClick={() => setPage('reading')}
      >
        Jetzt weiterlesen →
      </button>
    </section>

    {/* Vier kompakte Fortschrittskarten */}
    <section className="home-stats-grid">
      <article className="home-stat-card">
        <span>✨ Erfahrung</span>
        <strong>{xp} XP</strong>
        <small>
  {currentRank.icon} Level {level} · {currentRank.name}
</small>
        <div className="progress-track">
          <div
            className="progress-fill"
            style={{ width: `${levelProgress}%` }}
          />
        </div>
      </article>

      <article className="home-stat-card">
        <span>🔥 Leseserie</span>
        <strong>
          {currentStreak} {currentStreak === 1 ? 'Tag' : 'Tage'}
        </strong>
        <small>Rekord: {longestStreak} Tage</small>
      </article>

      <article className="home-stat-card">
        <span>📚 Bibelfortschritt</span>
        <strong>{bibleProgress} %</strong>
        <small>{totalRead} von {totalBibleVerses} Versen</small>
      </article>

      <article className="home-stat-card">
        <span>🏆 Bibelbücher</span>
        <strong>{completedBooks} / 66</strong>
        <small>Abgeschlossen</small>
      </article>
    </section>

    {/* Wochenübersicht */}
    <section className="home-panel">
      <h2>🗓️ Deine Lesewoche</h2>
      <div className="streak-week-days">
        {weekDays.map(day => (
          <div className="streak-day" key={day.date}>
            <span>{day.label}</span>
            <div
              className={[
                'streak-day-circle',
                day.completed ? 'completed' : '',
                day.isToday ? 'today' : '',
              ].filter(Boolean).join(' ')}
              title={day.date}
            >
              {day.completed ? '✓' : '–'}
            </div>
          </div>
        ))}
      </div>
    </section>

    {/* Auszeichnungen */}
    
<section className="home-panel home-ranks">
  <h2>🏔️ Meine Rangreise</h2>
  <p>
    Dein aktueller Rang: {currentRank.icon} {currentRank.name}
  </p>

  <div className="rank-list">
  {(showAllRanks
    ? levelRanks
    : levelRanks.filter(
        rank =>
          rank.minLevel === currentRank.minLevel ||
          rank.minLevel === nextRank?.minLevel
      )
  ).map((rank) => {
      const unlocked = level >= rank.minLevel
      const isCurrent = currentRank.minLevel === rank.minLevel

      return (
        <div
          key={rank.minLevel}
          className={`rank-item ${unlocked ? 'unlocked' : 'locked'} ${isCurrent ? 'current' : ''}`}
        >
          <span className="rank-icon">{rank.icon}</span>

          <div className="rank-info">
            <strong>{rank.name}</strong>
            <small>Ab Level {rank.minLevel}</small>
          </div>

          <span className="rank-status">
            {isCurrent ? 'Aktuell' : unlocked ? '✓' : '🔒'}
          </span>
        </div>
      )
    })}
  </div>
  <button
  className="rank-toggle-button"
  onClick={() => setShowAllRanks(!showAllRanks)}
>
  {showAllRanks ? 'Weniger anzeigen ↑' : 'Alle Ränge anzeigen ↓'}
</button>
</section>

    <section className="home-panel home-achievements">
      <h2>🏆 Meine Auszeichnungen</h2>
      <p>
        {unlockedAchievements.length} von {achievements.length}
        {' '}freigeschaltet
      </p>

      <div className="home-achievement-grid">
        {achievements.map(achievement => {
          const unlocked =
            completedBooks >= achievement.required

          return (
            <div
              key={achievement.id}
              className={
                unlocked
                  ? 'home-achievement unlocked'
                  : 'home-achievement locked'
              }
              title={achievement.description}
            >
              <span>{unlocked ? '🏆' : '🔒'}</span>
              <small>{achievement.title}</small>
            </div>
          )
        })}
      </div>
    </section>

    {/* XP-Protokoll */}
    <section className="home-panel">
      <h2>✨ Meine XP-Aktivitäten</h2>

      {xpHistory.length === 0 ? (
        <p>Noch keine neuen XP-Aktivitäten erfasst.</p>
      ) : (
        <ul className="xp-history">
          {xpHistory.slice(0, 5).map(entry => (
            <li key={entry.id}>
              <div>
                <strong>{entry.description}</strong>
                <small>{entry.date}</small>
              </div>
              <strong>+{entry.amount} XP</strong>
            </li>
          ))}
        </ul>
      )}
    </section>

    <button
      className="home-history-link"
      onClick={() => setPage('history')}
    >
      📚 Bereits gelesene Bibelbücher verwalten →
    </button>

<button
  className="home-history-link"
  onClick={() => setPage('profile')}
>
  👤 Mein Profil →
</button>

  </div>
) : page === 'adventure' ? (
  <div className="adventure-overview">
    <header className="adventure-overview-header">
      <span>🌍 ENTDECKE DIE BIBEL</span>
      <h1>Deine Abenteuerwelten</h1>
      <p>Jedes Bibelbuch erzählt seine eigene Geschichte.</p>
    </header>

    <div className="adventure-world-grid">
      <button
        type="button"
        className="adventure-world-card available"
        onClick={() => setPage('adventure-map')}
      >
        <img
          src={`${import.meta.env.BASE_URL}josua-map.png`}
          alt="Low-Poly-Landschaft von Josua"
        />
        <div className="adventure-world-info">
          <strong>Josua</strong>
          <span>Die Eroberung Kanaans</span>
          <small>🏔️ Abenteuer betreten →</small>
        </div>
      </button>

      {[
        { title: '2. Mose', subtitle: 'Der Auszug aus Ägypten', icon: '🏜️' },
        { title: 'Richter', subtitle: 'Mut und Glauben', icon: '⚔️' },
        { title: '1. Samuel', subtitle: 'Propheten und Könige', icon: '👑' },
      ].map(world => (
        <div className="adventure-world-card upcoming" key={world.title}>
          <div className="adventure-world-preview">
            <span>{world.icon}</span>
          </div>
          <div className="adventure-world-info">
            <strong>{world.title}</strong>
            <span>{world.subtitle}</span>
            <small>🔒 In Vorbereitung</small>
          </div>
        </div>
      ))}
    </div>
  </div>
) : page === 'adventure-map' ? (
  <div className="adventure-page">
    <button
  type="button"
  className="adventure-back-button"
  onClick={() => setPage('adventure')}
>
  ← Alle Abenteuer
</button>
    <div className="adventure-heading">
      <span>🏔️ DEINE BIBELREISE</span>
      <h1>Abenteuer</h1>
      <p>Erlebe die Bibel – Buch für Buch.</p>
    </div>

   <section className="adventure-compact-header">
  <div>
    <span className="adventure-label">DEIN ERSTES ABENTEUER</span>
    <h2>Josua</h2>
    <p>Die Eroberung Kanaans</p>
  </div>

  <div className="adventure-compact-details">
    <span>📖 24 Kapitel</span>
    <span>📍 5 Stationen</span>
  </div>
</section>

   
<JosuaAdventure
  completedChapters={josuaCompletedChapters}
  onRead={(chapterNumber) => {
    selectChapter('jos', chapterNumber)
    setPage('reading')
  }}
/>

  </div>
      
) : page === 'profile' ? (
  <div className="home-mobile">
    <section className="home-panel">

      

      <button
        className="back"
        onClick={() => setPage('home')}
      >
        ← Zurück zum Dashboard
      </button>

      <div className="profile-header">
        <div className="profile-avatar">
          {currentRank.icon}
        </div>

        <h1>{userName}</h1>
        <p>
          Level {level} · {currentRank.name}
        </p>
        <strong>{xp} XP gesammelt</strong>
      </div>
    </section>


    <section className="home-panel">
      <h2>📖 Meine Bibelreise</h2>

      <div className="home-stats-grid">
        <article className="home-stat-card">
          <span>✨ Level</span>
          <strong>{level}</strong>
        </article>

        <article className="home-stat-card">
          <span>🔥 Leseserie</span>
          <strong>{currentStreak} Tage</strong>
        </article>

        <article className="home-stat-card">
          <span>📚 Bibelfortschritt</span>
          <strong>{bibleProgress} %</strong>
        </article>

        <article className="home-stat-card">
          <span>🏆 Bibelbücher</span>
          <strong>{completedBooks} / 66</strong>
        </article>
        <AdventureBadges josuaCompleted={josuaBadgeUnlocked} />
      </div>
    </section>

    <section className="home-panel">
      <h2>⚙️ Meine Einstellungen</h2>
      
<section className="home-profile-setting">
  {isEditingName ? (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        saveUserName(String(formData.get('userName') || ''))
      }}
    >
      <input
        name="userName"
        type="text"
        defaultValue={userName}
        placeholder="Dein Name"
        maxLength={30}
        required
      />
      <button type="submit">Speichern</button>
      <button
        type="button"
        onClick={() => setIsEditingName(false)}
      >
        Abbrechen
      </button>
    </form>
  ) : (
    <button
      className="home-edit-name"
      onClick={() => setIsEditingName(true)}
    >
      <span>👤 {userName}</span>
      <span>✎ Name ändern</span>
    </button>
  )}
</section>

      
<div className="profile-backup">
  <h3>💾 Meine Datensicherung</h3>

  <p>
    Sichere deine Bibelreise, damit deine Fortschritte
    nicht verloren gehen.
  </p>

  <button
    type="button"
    className="backup-button"
    onClick={exportBackup}
  >
    📥 Fortschritt exportieren
  </button>
  
<label className="backup-import-button">
  📤 Fortschritt importieren

  <input
    type="file"
    accept=".json,application/json"
    onChange={importBackup}
    className="backup-file-input"
  />
</label>

</div>

    </section>
  </div>
) : page === 'history' ? (

        <section className="card reading">
          <button
            className="back"
            onClick={() => setPage('home')}
          >
            ← Zurück zum Dashboard
          </button>

          <h1>📚 Meine bisherige Bibellektüre</h1>

          <p>
            Markiere alle Bibelbücher, die du bereits vor
            DailyQuest vollständig gelesen hast.
            Diese Bücher zählen zu deinem Bibelfortschritt,
            bringen aber keine XP oder Auszeichnungen.
          </p>

          <h2>
            {historicalBooks.length} von 66 Bibelbüchern
            bereits gelesen
          </h2>

          {(['AT', 'NT'] as const).map(testament => (
            <div key={testament}>
              <h2>
                {testament === 'AT'
                  ? 'Hebräische Schriften'
                  : 'Christliche Griechische Schriften'}
              </h2>

              {bibleBooks
                .filter(book => book.testament === testament)
                .map(book => (
                  <label
                    key={book.id}
                    className="historical-book"
                  >
                    <input
                      type="checkbox"
                      checked={historicalBooks.includes(book.id)}
                      onChange={() => toggleHistoricalBook(book.id)}
                    />

                    <span>{book.name}</span>
                    <span className="historical-chapters">
                      {book.verses.length} Kapitel
                    </span>
                  </label>
                ))}
            </div>
          ))}
        </section>
      ) : (
        <section className="card reading">
          <button
            className="back"
            onClick={() => setPage('home')}
          >
            ← Zurück zum Dashboard
          </button>

          <h1>📖 Bibellesen</h1>

          <label htmlFor="book">Bibelbuch</label>
          <select
            id="book"
            value={bookId}
            onChange={e =>
              selectChapter(e.target.value, 1)
            }
          >
            <optgroup label="Hebräische Schriften">
              {bibleBooks
                .filter(book => book.testament === 'AT')
                .map(book => (
                  <option key={book.id} value={book.id}>
                    {book.name}
                  </option>
                ))}
            </optgroup>
            <optgroup label="Christliche Griechische Schriften">
              {bibleBooks
                .filter(book => book.testament === 'NT')
                .map(book => (
                  <option key={book.id} value={book.id}>
                    {book.name}
                  </option>
                ))}
            </optgroup>
          </select>

          <label htmlFor="chapter">Kapitel</label>
          <select
            id="chapter"
            value={chapter}
            onChange={e =>
              selectChapter(bookId, Number(e.target.value))
            }
          >
            {selectedBook.verses.map((_, index) => (
              <option key={index + 1} value={index + 1}>
                Kapitel {index + 1}
              </option>
            ))}
          </select>

          <h2>{selectedBook.name} {chapter}</h2>
          <p>
            {readCount} von {totalVerses} Versen gelesen
          </p>
{nextRank && (
  <small className="next-rank">
    Nächster Rang: {nextRank.icon} {nextRank.name}
    {' '}ab Level {nextRank.minLevel}
  </small>
)}
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="verse-fields">
            <div>
              <label htmlFor="start">Von Vers</label>
              <select
                id="start"
                value={start}
                onChange={e =>
                  setStart(Number(e.target.value))
                }
              >
                {Array.from(
                  { length: totalVerses },
                  (_, i) => i + 1
                ).map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="end">Bis Vers</label>
              <select
                id="end"
                value={end}
                onChange={e =>
                  setEnd(Number(e.target.value))
                }
              >
                {Array.from(
                  { length: totalVerses },
                  (_, i) => i + 1
                ).map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          <button onClick={saveReading}>
            ✓ Versbereich speichern
          </button>

          {message && (
            <p className="feedback" role="status">
              {message}
            </p>
          )}

          <h3>Bereits erfasste Bereiche</h3>

          {chapterReadings.length === 0 ? (
            <p>Noch keine Verse erfasst.</p>
          ) : (
            <ul>
              
{chapterReadings.map((r, index) => (
  <li className="reading-entry" key={index}>
    <span>
      {selectedBook.name} {chapter}:{r.start}–{r.end}
    </span>

    <button
      type="button"
      className="delete-reading-button"
      onClick={() => deleteReading(r)}
    >
      🗑️ Löschen
    </button>
  </li>
))}

            </ul>
          )}
        </section>
      )}
      
<nav className="bottom-navigation" aria-label="Hauptnavigation">
  <button
    type="button"
    className={`bottom-nav-item ${page === 'home' ? 'active' : ''}`}
    onClick={() => setPage('home')}
    aria-current={page === 'home' ? 'page' : undefined}
  >
    <span className="bottom-nav-icon">⌂</span>
    <span>Start</span>
  </button>

  <button
    type="button"
    className={`bottom-nav-item ${page === 'reading' ? 'active' : ''}`}
    onClick={() => setPage('reading')}
    aria-current={page === 'reading' ? 'page' : undefined}
  >
    <span className="bottom-nav-icon">📖</span>
    <span>Bibellesen</span>
  </button>
<button
  type="button"
  className={`bottom-nav-item ${page === 'adventure' ? 'active' : ''}`}
  onClick={() => setPage('adventure')}
  aria-current={page === 'adventure' ? 'page' : undefined}
>
  <span className="bottom-nav-icon">🏔️</span>
  <span>Abenteuer</span>
</button>
  <button
    type="button"
    className={`bottom-nav-item ${page === 'profile' ? 'active' : ''}`}
    onClick={() => setPage('profile')}
    aria-current={page === 'profile' ? 'page' : undefined}
  >
    <span className="bottom-nav-icon">♙</span>
    <span>Profil</span>
  </button>
</nav>

{showJosuaUnlock && (
  <JosuaUnlock
    onClose={() => setShowJosuaUnlock(false)}
  />
)}

    </main>
  )
}

export default App
