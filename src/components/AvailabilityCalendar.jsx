import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
const localDate = (s) => {
  if (!s) return new Date();
  if (s instanceof Date) return s;
  const str = String(s);
  const dateOnly = str.split("T")[0];
  const d = new Date(dateOnly + "T12:00:00");
  return isNaN(d.getTime()) ? new Date() : d;
};

export default function AvailabilityCalendar({ blocks = [] }) {
  const booked = (blocks || [])
    .filter((b) => String(b.reason).toUpperCase() === "BOOKED")
    .map((b) => {
      const from = localDate(b.start || b.startDate);
      const to = new Date(localDate(b.end || b.endDate).getTime() - 86400000);
      return { from, to: to >= from ? to : from };
    });
  const blocked = (blocks || [])
    .filter((b) => String(b.reason).toUpperCase() !== "BOOKED")
    .map((b) => {
      const from = localDate(b.start || b.startDate);
      const to = new Date(localDate(b.end || b.endDate).getTime() - 86400000);
      return { from, to: to >= from ? to : from };
    });
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
