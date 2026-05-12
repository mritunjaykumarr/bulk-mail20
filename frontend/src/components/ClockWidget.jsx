import { useEffect, useMemo, useState } from 'react';

function getClockState(date) {
  const seconds = date.getSeconds();
  const minutes = date.getMinutes();
  const hours = date.getHours() % 12;

  return {
    digital: date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }),
    secondDeg: seconds * 6,
    minuteDeg: minutes * 6 + seconds * 0.1,
    hourDeg: hours * 30 + minutes * 0.5
  };
}

export default function ClockWidget() {
  const [now, setNow] = useState(() => new Date());
  const clock = useMemo(() => getClockState(now), [now]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <section className="clockWidget" aria-label="Current time">
      <div className="clockFace" aria-hidden="true">
        <span className="clockDot" />
        <span className="clockHand hour" style={{ transform: `rotate(${clock.hourDeg}deg)` }} />
        <span className="clockHand minute" style={{ transform: `rotate(${clock.minuteDeg}deg)` }} />
        <span className="clockHand second" style={{ transform: `rotate(${clock.secondDeg}deg)` }} />
      </div>
      <div>
        <span className="eyebrow">Current time</span>
        <strong>{clock.digital}</strong>
      </div>
    </section>
  );
}
