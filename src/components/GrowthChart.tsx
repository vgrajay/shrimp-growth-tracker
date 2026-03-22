import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";

interface DataPoint {
  date: string;
  abw: number | null;
}

interface Props {
  data: DataPoint[];
}

export default function GrowthChart({ data }: Props) {
  const chartData = data
    .filter((d) => d.abw !== null)
    .map((d) => ({
      date: format(new Date(d.date + "T00:00:00"), "dd/MM"),
      abw: d.abw,
    }));

  if (chartData.length < 2) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-heading">Growth Chart</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground italic">
            Need at least 2 ABW entries to show the chart
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-heading">ABW Growth Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" unit="g" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Line
                type="monotone"
                dataKey="abw"
                stroke="hsl(var(--primary))"
                strokeWidth={2.5}
                dot={{ fill: "hsl(var(--primary))", r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
