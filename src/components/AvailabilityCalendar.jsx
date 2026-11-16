import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
const localDate = (s) => new Date(s + "T12:00:00");
export default function AvailabilityCalendar({ blocks = [] }) {
  const booked = blocks
    .filter((b) => String(b.reason).toUpperCase() === "BOOKED")
    .map((b) => ({
      from: localDate(b.start || b.startDate),
      to: new Date(localDate(b.end || b.endDate).getTime() - 86400000),
    }));
  const blocked = blocks
    .filter((b) => String(b.reason).toUpperCase() !== "BOOKED")
    .map((b) => ({
      from: localDate(b.start || b.startDate),
      to: new Date(localDate(b.end || b.endDate).getTime() - 86400000),
    }));
  return (
    <div className="availability-calendar">
      <DayPicker
        mode="single"
        disabled={[
          { before: new Date(new Date().setHours(0, 0, 0, 0)) },
          ...booked,
          ...blocked,
        ]}
        modifiers={{ booked, blocked }}
        modifiersClassNames={{ booked: "date-booked", blocked: "date-blocked" }}
        numberOfMonths={1}
      />
      <div className="calendar-legend">
        <span>
          <i />
          Available
        </span>
        <span>
          <i className="booked" />
          Booked
        </span>
        <span>
          <i className="blocked" />
          Host blocked
        </span>
      </div>
      <small>
        Green indicates available dates. Sand indicates booked dates; grey
        indicates host blocks.
      </small>
    </div>
  );
}
