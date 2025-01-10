// src/components/admin/DashboardStats.tsx
import React from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';

interface ConversionData {
  country: string;
  rate: number;
}

interface VisitsData {
  date: string;
  visits: number;
}

interface DashboardStatsProps {
  conversionData: ConversionData[];
  visitsData: VisitsData[];
}

const DashboardStats = ({ conversionData, visitsData }: DashboardStatsProps) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      {/* Graphique des conversions */}
      <Card>
        <CardHeader>
          <CardTitle>Taux de conversion par pays</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={conversionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="country" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="rate" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Graphique des visites */}
      <Card>
        <CardHeader>
          <CardTitle>Visites journalières</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={visitsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="visits" stroke="#EC4899" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Statistiques chatbot */}
      <Card>
        <CardHeader>
          <CardTitle>Performance du chatbot</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600">Taux de réponse</p>
              <p className="text-2xl font-bold text-blue-600">98%</p>
            </div>
            <div className="p-4 bg-pink-50 rounded-lg">
              <p className="text-sm text-gray-600">Satisfaction</p>
              <p className="text-2xl font-bold text-pink-600">4.8/5</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance du blog */}
      <Card>
        <CardHeader>
          <CardTitle>Engagement blog</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Temps moyen de lecture</span>
              <span className="text-lg font-semibold">3:45</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Articles les plus lus</span>
              <span className="text-lg font-semibold">12.3k vues</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardStats;