import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
const data = [
  { day: "Mon", views: 42 },
  { day: "Tue", views: 68 },
  { day: "Wed", views: 53 },
  { day: "Thu", views: 94 },
  { day: "Fri", views: 80 },
  { day: "Sat", views: 128 },
  { day: "Sun", views: 112 },
];
export default function Analytics() {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="chart-green" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#147d64" stopOpacity={0.2} />
            <stop offset="100%" stopColor="#147d64" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#e9ece8" />
        <XAxis
          dataKey="day"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "#8b9690", fontSize: 12 }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          width={30}
          tick={{ fill: "#8b9690", fontSize: 12 }}
        />
        <Tooltip />
        <Area
          type="monotone"
          dataKey="views"
          stroke="#147d64"
          fill="url(#chart-green)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
