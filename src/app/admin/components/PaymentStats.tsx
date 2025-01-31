// src/features/admin/components/PaymentStats.tsx
'use client';

import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { CreditCard, Smartphone, Wallet } from 'lucide-react';

interface PaymentMethod {
  name: string;
  total: number;
  count: number;
  icon: React.ElementType;
  color: string;
}

export default function PaymentStats() {
  const [timeframe, setTimeframe] = useState<'day' | 'week' | 'month'>('week');

  const paymentMethods: PaymentMethod[] = [
    {
      name: 'Wave',
      total: 850000,
      count: 25,
      icon: Wallet,
      color: '#1BA7FF'
    },
    {
      name: 'Orange Money',
      total: 650000,
      count: 18,
      icon: Smartphone,
      color: '#FF6634'
    },
    {
      name: 'Carte bancaire',
      total: 250000,
      count: 7,
      icon: CreditCard,
      color: '#4C566A'
    }
  ];

  const chartData = [
    { day: 'Lun', Wave: 150000, OrangeMoney: 120000, CarteBancaire: 50000 },
    { day: 'Mar', Wave: 180000, OrangeMoney: 90000, CarteBancaire: 30000 },
    { day: 'Mer', Wave: 120000, OrangeMoney: 140000, CarteBancaire: 40000 },
    { day: 'Jeu', Wave: 160000, OrangeMoney: 110000, CarteBancaire: 35000 },
    { day: 'Ven', Wave: 140000, OrangeMoney: 130000, CarteBancaire: 45000 },
    { day: 'Sam', Wave: 100000, OrangeMoney: 60000, CarteBancaire: 50000 }
  ];

  const formatAmount = (amount: number) => {
    return `${amount.toLocaleString()} FCFA`;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold">Paiements</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setTimeframe('day')}
            className={`px-3 py-1 rounded-full text-sm ${
              timeframe === 'day'
                ? 'bg-brand-blue text-white'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            Jour
          </button>
          <button
            onClick={() => setTimeframe('week')}
            className={`px-3 py-1 rounded-full text-sm ${
              timeframe === 'week'
                ? 'bg-brand-blue text-white'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            Semaine
          </button>
          <button
            onClick={() => setTimeframe('month')}
            className={`px-3 py-1 rounded-full text-sm ${
              timeframe === 'month'
                ? 'bg-brand-blue text-white'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            Mois
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {paymentMethods.map((method) => {
          const Icon = method.icon;
          return (
            <div
              key={method.name}
              className="p-4 rounded-lg"
              style={{ backgroundColor: `${method.color}10` }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: `${method.color}20` }}
                >
                  <Icon className="w-5 h-5" style={{ color: method.color }} />
                </div>
                <span className="font-medium">{method.name}</span>
              </div>
              <div className="text-2xl font-bold mb-1">
                {formatAmount(method.total)}
              </div>
              <div className="text-sm text-gray-500">
                {method.count} paiements
              </div>
            </div>
          );
        })}
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barSize={20}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis tickFormatter={(value) => `${value / 1000}k`} />
            <Tooltip
              formatter={(value: number) => formatAmount(value)}
              labelFormatter={(label) => `${label}`}
            />
            <Bar
              dataKey="Wave"
              fill="#1BA7FF"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="OrangeMoney"
              fill="#FF6634"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="CarteBancaire"
              fill="#4C566A"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}