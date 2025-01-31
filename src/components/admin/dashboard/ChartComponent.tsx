// src/components/admin/dashboard/ChartComponent.tsx
'use client';

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface ChartComponentProps {
  data: Array<{ time: string; value: number }>;
  totalSales: number;
}

export default function ChartComponent({ data, totalSales }: ChartComponentProps) {
  return (
    <div className="h-[300px] md:h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart 
          data={data}
          margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
        >
          <XAxis 
            dataKey="time"
            stroke="#94a3b8"
            fontSize={12}
            tickFormatter={(time) => time.split(':')[0] + 'h'}
            padding={{ left: 10, right: 10 }}
          />
          <YAxis
            stroke="#94a3b8"
            fontSize={12}
            tickFormatter={(value) => `${(value / 1000).toFixed(1)}k`}
            width={60}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload || !payload.length || !payload[0]?.value) {
                return null;
              }
              return (
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 rounded-lg shadow-lg">
                  <p className="font-medium text-gray-900 dark:text-white mb-1">
                    {label}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {`${Number(payload[0].value).toLocaleString()} FCFA`}
                  </p>
                </div>
              );
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#2563eb"
            strokeWidth={2}
            dot={false}
            activeDot={{ 
              r: 6, 
              fill: "#2563eb",
              stroke: "#fff",
              strokeWidth: 2
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}