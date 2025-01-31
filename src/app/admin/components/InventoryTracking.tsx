// src/features/admin/components/InventoryTracking.tsx
'use client';

import { useState } from 'react';
import { 
  Package, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  ChevronRight,
  Search
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  stock: number;
  minStock: number;
  salesVelocity: number;
  restockETA?: string;
  variants: {
    name: string;
    stock: number;
    minStock: number;
  }[];
}

export default function InventoryTracking() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'low' | 'out'>('all');

  // Exemple de données - À remplacer par les vraies données de Supabase
  const products: Product[] = [
    {
      id: '1',
      name: 'Mocassins Tressés',
      stock: 15,
      minStock: 20,
      salesVelocity: 2.5, // ventes par jour
      variants: [
        { name: '42 - Marron', stock: 2, minStock: 5 },
        { name: '43 - Marron', stock: 1, minStock: 5 },
        { name: '42 - Noir', stock: 7, minStock: 5 },
        { name: '43 - Noir', stock: 5, minStock: 5 },
      ]
    },
    {
      id: '2',
      name: 'Sandales en Cuir',
      stock: 25,
      minStock: 15,
      salesVelocity: 1.8,
      restockETA: '2024-02-01',
      variants: [
        { name: '41 - Beige', stock: 8, minStock: 3 },
        { name: '42 - Beige', stock: 12, minStock: 3 },
        { name: '43 - Beige', stock: 5, minStock: 3 },
      ]
    }
  ];

  const filteredProducts = products
    .filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = 
        filterType === 'all' ? true :
        filterType === 'low' ? product.stock <= product.minStock :
        product.stock === 0;
      return matchesSearch && matchesFilter;
    });

  const calculateStockStatus = (current: number, min: number) => {
    if (current === 0) return { label: 'Rupture', color: 'text-red-600 bg-red-50' };
    if (current <= min) return { label: 'Stock bas', color: 'text-orange-600 bg-orange-50' };
    return { label: 'En stock', color: 'text-green-600 bg-green-50' };
  };

  // Calculer les jours restants avant rupture de stock
  const getDaysUntilStockout = (stock: number, velocity: number) => {
    if (velocity === 0) return '∞';
    const days = Math.floor(stock / velocity);
    return days === 0 ? '< 1' : days.toString();
  };

  return (
    <div className="bg-white rounded-xl shadow-sm">
      <div className="p-6 border-b">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold">Gestion des stocks</h2>
          <button className="px-4 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-blue/90 transition-colors">
            Commander
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-4 rounded-lg bg-green-50">
            <div className="flex items-center gap-3 mb-3">
              <Package className="w-5 h-5 text-green-600" />
              <span className="text-green-600 font-medium">Produits en stock</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">32</div>
            <div className="flex items-center gap-1 mt-1 text-sm text-green-600">
              <TrendingUp className="w-4 h-4" />
              <span>+3 depuis hier</span>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-orange-50">
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <span className="text-orange-600 font-medium">Stock faible</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">8</div>
            <div className="flex items-center gap-1 mt-1 text-sm text-orange-600">
              <TrendingUp className="w-4 h-4" />
              <span>+2 depuis hier</span>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-red-50">
            <div className="flex items-center gap-3 mb-3">
              <Package className="w-5 h-5 text-red-600" />
              <span className="text-red-600 font-medium">Rupture de stock</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">3</div>
            <div className="flex items-center gap-1 mt-1 text-sm text-red-600">
              <TrendingDown className="w-4 h-4" />
              <span>-1 depuis hier</span>
            </div>
          </div>
        </div>

        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un produit..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-2 rounded-lg text-sm ${
                filterType === 'all'
                  ? 'bg-brand-blue text-white'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              Tous
            </button>
            <button
              onClick={() => setFilterType('low')}
              className={`px-3 py-2 rounded-lg text-sm ${
                filterType === 'low'
                  ? 'bg-brand-blue text-white'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              Stock bas
            </button>
            <button
              onClick={() => setFilterType('out')}
              className={`px-3 py-2 rounded-lg text-sm ${
                filterType === 'out'
                  ? 'bg-brand-blue text-white'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              Rupture
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Produit</th>
              <th className="text-center py-4 px-6 text-sm font-medium text-gray-500">Stock total</th>
              <th className="text-center py-4 px-6 text-sm font-medium text-gray-500">Jours restants</th>
              <th className="text-center py-4 px-6 text-sm font-medium text-gray-500">Statut</th>
              <th className="text-center py-4 px-6 text-sm font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((product) => {
              const status = calculateStockStatus(product.stock, product.minStock);
              const daysLeft = getDaysUntilStockout(product.stock, product.salesVelocity);
              
              return (
                <tr key={product.id} className="border-b hover:bg-gray-50">
                  <td className="py-4 px-6">
                    <div>
                      <div className="font-medium text-gray-900">{product.name}</div>
                      <div className="text-sm text-gray-500">
                        {product.variants.length} variantes
                      </div>
                    </div>
                  </td>
                  <td className="text-center py-4 px-6">
                    <span className="font-medium">{product.stock}</span>
                    <span className="text-sm text-gray-500"> / {product.minStock} min</span>
                  </td>
                  <td className="text-center py-4 px-6">
                    <div>
                      <span className="font-medium">{daysLeft}</span>
                      <span className="text-sm text-gray-500"> jours</span>
                    </div>
                    {product.restockETA && (
                      <div className="text-xs text-gray-500">
                        Réappro. prévue le {new Date(product.restockETA).toLocaleDateString()}
                      </div>
                    )}
                  </td>
                  <td className="text-center py-4 px-6">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                      {status.label}
                    </span>
                  </td>
                  <td className="text-center py-4 px-6">
                    <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                      <ChevronRight className="w-5 h-5 text-gray-500" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}