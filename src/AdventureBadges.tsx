
import './AdventureBadges.css'

type AdventureBadgesProps = {
  josuaCompleted: boolean
}

export default function AdventureBadges({
  josuaCompleted,
}: AdventureBadgesProps) {
  return (
    <section className="adventure-badges">
      <div className="adventure-badges-header">
        <div>
          <span className="adventure-badges-label">
            DEINE ERFOLGE
          </span>
          <h2>🏆 Abenteuer-Abzeichen</h2>
        </div>

        <span className="adventure-badges-count">
          {josuaCompleted ? 1 : 0} / 1
        </span>
      </div>

      <div className="adventure-badges-grid">
        <div className="adventure-badge-card">
          <img
            src={`${import.meta.env.BASE_URL}josua-abzeichen.png`}
            alt="Eroberer von Kanaan"
            className={
              josuaCompleted
                ? 'adventure-badge-image'
                : 'adventure-badge-image locked'
            }
          />

          <h3>Eroberer von Kanaan</h3>
          <p>Josua</p>

          <span
            className={
              josuaCompleted
                ? 'adventure-badge-status unlocked'
                : 'adventure-badge-status'
            }
          >
            {josuaCompleted
              ? '✓ Freigeschaltet'
              : '🔒 Noch gesperrt'}
          </span>
        </div>
      </div>
    </section>
  )
}
