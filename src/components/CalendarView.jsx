const TYPE_COLORS = {
  sport:     { bg: "#3a3210", text: "#e8c84a", label: "Sportklasse" },
  fun:       { bg: "#3a1810", text: "#e05c3a", label: "Fun / Kermis" },
  cross:     { bg: "#102838", text: "#4ab8e8", label: "Cross" },
  groepsrit: { bg: "#102810", text: "#4ae882", label: "Groepsrit" },
};

const MONTHS = [
  "Januari","Februari","Maart","April","Mei","Juni",
  "Juli","Augustus","September","Oktober","November","December"
];

function groupByMonth(races) {
  const groups = {};
  const uncertain = [];

  for (const race of races) {
    if (race.date) {
      const month = parseInt(race.date.split("-")[1]) - 1;
      const key = `${race.date.split("-")[0]}-${month}`;
      if (!groups[key]) groups[key] = { month, year: race.date.split("-")[0], races: [] };
      groups[key].races.push(race);
    } else {
      uncertain.push(race);
    }
  }

  return { groups, uncertain };
}

export default function CalendarView({ races, onDelete }) {
  const { groups, uncertain } = groupByMonth(races);
  const sortedKeys = Object.keys(groups).sort();

  return (
    <div className="calendar-view">
      {sortedKeys.map(key => {
        const { month, year, races: monthRaces } = groups[key];
        return (
          <section key={key} className="month-section">
            <h2 className="month-title">
              <span className="month-name">{MONTHS[month]}</span>
              <span className="month-year">{year}</span>
            </h2>
            <div className="race-list">
              {monthRaces.map(race => (
                <RaceCard key={race.id} race={race} onDelete={onDelete} />
              ))}
            </div>
          </section>
        );
      })}

      {uncertain.length > 0 && (
        <section className="month-section">
          <h2 className="month-title">
            <span className="month-name">Datum onzeker</span>
          </h2>
          <div className="race-list">
            {uncertain.map(race => (
              <RaceCard key={race.id} race={race} onDelete={onDelete} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function RaceCard({ race, onDelete }) {
  const typeStyle = TYPE_COLORS[race.type] || TYPE_COLORS.fun;

  return (
    <div className="race-card">
      <div className="race-card-date">
        {race.date ? (
          <>
            <span className="date-day">{race.date.split("-")[2]}</span>
            <span className="date-month">{MONTHS[parseInt(race.date.split("-")[1]) - 1].slice(0,3)}</span>
          </>
        ) : (
          <span className="date-unknown">?</span>
        )}
      </div>

      <div className="race-card-body">
        <div className="race-card-top">
          <span className="race-card-name">{race.name}</span>
          <span
            className="type-badge"
            style={{ background: typeStyle.bg, color: typeStyle.text }}
          >
            {typeStyle.label}
          </span>
        </div>

        <div className="race-card-meta">
          <span>📍 {race.place}</span>
          {race.dateLabel && <span>📅 {race.dateLabel}</span>}
        </div>

        {race.notes && (
          <div className="race-card-notes">{race.notes}</div>
        )}

        <div className="race-card-actions">
          {race.url && (
            <a href={race.url} target="_blank" rel="noopener noreferrer" className="link-btn">
              🔗 Meer info
            </a>
          )}
          {race.gpxUrl && (
            <a href={race.gpxUrl} target="_blank" rel="noopener noreferrer" className="link-btn">
              🗺️ GPX / Route
            </a>
          )}
          {onDelete && (
            <button className="delete-btn" onClick={() => onDelete(race.id)}>
              🗑️ Verwijder
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
