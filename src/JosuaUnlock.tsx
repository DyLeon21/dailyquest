
import './JosuaUnlock.css'

type JosuaUnlockProps = {
  onClose: () => void
}

export default function JosuaUnlock({ onClose }: JosuaUnlockProps) {
  return (
    <div className="josua-unlock-overlay">
      <div className="josua-unlock-modal">
        <div className="josua-unlock-heading">
          ✨ ABENTEUER ABGESCHLOSSEN ✨
        </div>

        <img
          className="josua-unlock-badge"
          src={`${import.meta.env.BASE_URL}josua-abzeichen.png`}
          alt="Eroberer von Kanaan"
        />

        <h2>Eroberer von Kanaan</h2>

        <p>
          Du hast alle 24 Kapitel des Buches Josua gelesen!
        </p>

        <div className="josua-unlock-xp">+150 XP</div>

        <button onClick={onClose}>Weiter</button>
      </div>
    </div>
  )
}
