import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
const localDate = (s) => new Date(s + "T12:00:00");
export default function AvailabilityCalendar({ blocks = [] }) {
  const booked = blocks
    .filter((b) => b.reason === "Booked")
    .map((b) => ({
      from: localDate(b.start),
      to: new Date(localDate(b.end).getTime() - 86400000),
    }));
  const blocked = blocks
    .filter((b) => b.reason !== "Booked")
    .map((b) => ({
      from: localDate(b.start),
      to: new Date(localDate(b.end).getTime() - 86400000),
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
      <small>Dates are for inspection only. Stays cannot be reserved.</small>
    </div>
  );
}
