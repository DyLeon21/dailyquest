import { useState } from 'react'
import './JosuaAdventure.css'

type JosuaAdventureProps = {
  completedChapters: boolean[]
  onRead: (chapter: number) => void
}

const stations = [
  {
    id: 1,
    title: 'Der neue Anführer',
    chapters: 'Josua 1–2',
    startChapter: 1,
    endChapter: 2,
    description:
      'Josua übernimmt die Führung Israels. Zwei Kundschafter treffen Rahab in Jericho.',
    x: 26,
    y: 80.5,
  },
  {
    id: 2,
    title: 'Durch den Jordan',
    chapters: 'Josua 3–5',
    startChapter: 3,
    endChapter: 5,
    description:
      'Die Israeliten überqueren den Jordan und betreten das verheißene Land.',
    x: 42,
    y: 65.5,
  },
  {
    id: 3,
    title: 'Die Mauern Jerichos',
    chapters: 'Josua 6',
    startChapter: 6,
    endChapter: 6,
    description:
      'Die Israeliten folgen Jehovas Anweisungen bei Jericho.',
    x: 65,
    y: 52.3,
  },
  {
    id: 4,
    title: 'Das verheißene Land',
    chapters: 'Josua 7–21',
    startChapter: 7,
    endChapter: 21,
    description:
      'Israel erlebt weitere Herausforderungen und erhält sein Erbteil im Land.',
    x: 64,
    y: 33,
  },
  {
    id: 5,
    title: 'Josuas letzte Worte',
    chapters: 'Josua 22–24',
    startChapter: 22,
    endChapter: 24,
    description:
      'Josua ermuntert das Volk, Jehova weiterhin treu zu dienen.',
    x: 61,
    y: 19,
  },
]

export default function JosuaAdventure({
  completedChapters,
  onRead,
}: JosuaAdventureProps) {
  const [selectedStation, setSelectedStation] = useState<number | null>(null)

  const activeStation = stations.find(
    station => station.id === selectedStation
  )
  const activeCompleted = activeStation
    ? getCompletedCount(
        activeStation.startChapter,
        activeStation.endChapter
      )
    : 0

  const activeTotal = activeStation
    ? activeStation.endChapter - activeStation.startChapter + 1
    : 0

  const activeProgress = activeTotal > 0
    ? (activeCompleted / activeTotal) * 100
    : 0

  const activeIsComplete =
    activeTotal > 0 && activeCompleted === activeTotal
  function getNextChapter(startChapter: number, endChapter: number) {
    for (let chapter = startChapter; chapter <= endChapter; chapter++) {
      if (!completedChapters[chapter - 1]) {
        return chapter
      }
    }

    return startChapter
  }

  function getCompletedCount(startChapter: number, endChapter: number) {
    let count = 0

    for (let chapter = startChapter; chapter <= endChapter; chapter++) {
      if (completedChapters[chapter - 1]) {
        count++
      }
    }

    return count
  }
  const adventureCompleted = completedChapters.length === 24 &&
    completedChapters.every(Boolean)
  return (
    <div className="josua-adventure">
      <div className="josua-map-container">
        <img
          src={`${import.meta.env.BASE_URL}josua-map.png`}
          alt="Abenteuerkarte mit Jordan, Jericho und Bergen"
          className="josua-map-image"
        />

{/* Animiertes Wasser am Wasserfall */}
<div className="josua-waterfall-effect" />

        {stations.map(station => {
          const completed = getCompletedCount(
            station.startChapter,
            station.endChapter
          )

          const total = station.endChapter - station.startChapter + 1
          const isComplete = completed === total

          return (
            <button
              key={station.id}
              type="button"
              className={`josua-station ${isComplete ? 'completed' : ''} ${
                selectedStation === station.id ? 'selected' : ''
              }`}
              style={{
                left: `${station.x}%`,
                top: `${station.y}%`,
              }}
              onClick={() => setSelectedStation(station.id)}
              aria-label={`${station.title}, ${completed} von ${total} Kapiteln abgeschlossen`}
            >
              {isComplete ? '✓' : station.id}
            </button>
          )
        })}
      </div>

      {activeStation && (
        <section className="josua-station-info">
          <button
            type="button"
            className="josua-info-close"
            onClick={() => setSelectedStation(null)}
            aria-label="Stationsinfo schließen"
          >
            ✕
          </button>

          <span className="josua-info-label">
            STATION {activeStation.id} VON 5
          </span>

          <h2>{activeStation.title}</h2>
          <p>{activeStation.description}</p>

          <strong>{activeStation.chapters}</strong>

          
          <div className="josua-progress">
            <div className="josua-progress-header">
              <span>Lesefortschritt</span>
              <strong>
                {activeCompleted} / {activeTotal} Kapitel
              </strong>
            </div>

            <div className="josua-progress-track">
              <div
                className="josua-progress-fill"
                style={{ width: `${activeProgress}%` }}
              />
            </div>
          </div>

          {activeIsComplete && (
            <div className="josua-complete-message">
              ✓ Station abgeschlossen!
            </div>
          )}


         
          <button
            type="button"
            className="josua-read-button"
            onClick={() =>
              onRead(
                getNextChapter(
                  activeStation.startChapter,
                  activeStation.endChapter
                )
              )
            }
          >
            {activeIsComplete
              ? '✓ Kapitel erneut lesen'
              : `📖 Kapitel ${getNextChapter(
                  activeStation.startChapter,
                  activeStation.endChapter
                )} lesen →`}
          </button>

        </section>
      )}

      <section className={`josua-award ${adventureCompleted ? 'unlocked' : 'locked'}`}>
        <img
          src={`${import.meta.env.BASE_URL}josua-abzeichen.png`}
          alt="Abzeichen Eroberer von Kanaan"
          className="josua-award-image"
        />

        <div className="josua-award-content">
          <span className="josua-info-label">
            ABENTEUER-AUSZEICHNUNG
          </span>

          <h3>Eroberer von Kanaan</h3>

          <p>
            {adventureCompleted
              ? '🏆 Abzeichen freigeschaltet!'
              : 'Schließe alle 24 Kapitel von Josua ab, um dieses Abzeichen freizuschalten.'}
          </p>

          <strong>
            {completedChapters.filter(Boolean).length} / 24 Kapitel
          </strong>
        </div>
      </section>

    </div>
  )
}
