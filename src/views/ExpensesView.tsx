import React, { useState, useMemo } from 'react';
import { TrendingDown, Search, Plus, PieChart as PieChartIcon, Tag, Wallet, Filter, CheckCircle2, ArrowUpRight, BarChart3 } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { db } from '../services/db';
import Pagination from '../components/Pagination';
import { DEFAULT_PAGE_SIZE } from '../config/pagination';

interface ExpensesViewProps {
  onOpenQuickAdd: (type: string) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  Parts: '#ef4444',       // Rose / Red
  Utilities: '#2563eb',   // Blue
  Maintenance: '#8b5cf6', // Violet
  Fuel: '#f59e0b',        // Amber
  Transport: '#06b6d4',   // Cyan
  Salaries: '#10b981',    // Emerald
  'Petty Cash': '#ea580c',// Orange
  Other: '#64748b',       // Slate
};

const CATEGORY_BG_BADGES: Record<string, string> = {
  Parts: 'bg-rose-100 text-rose-800 border-rose-200',
  Utilities: 'bg-blue-100 text-blue-800 border-blue-200',
  Maintenance: 'bg-violet-100 text-violet-800 border-violet-200',
  Fuel: 'bg-amber-100 text-amber-800 border-amber-200',
  Transport: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  Salaries: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'Petty Cash': 'bg-orange-100 text-orange-800 border-orange-200',
  Other: 'bg-slate-100 text-slate-800 border-slate-200',
};

export const ExpensesView: React.FC<ExpensesViewProps> = ({ onOpenQuickAdd }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activePieIndex, setActivePieIndex] = useState<number | null>(null);

  const expenses = db.getExpenses();

  const totalExpenses = useMemo(() => expenses.reduce((sum, e) => sum + e.amount, 0), [expenses]);

  // Categorical aggregation for Pie Chart
  const categoryData = useMemo(() => {
    const map: Record<string, { name: string; value: number; count: number }> = {};
    expenses.forEach(e => {
      const cat = e.category || 'Other';
      if (!map[cat]) {
        map[cat] = { name: cat, value: 0, count: 0 };
      }
      map[cat].value += e.amount;
      map[cat].count += 1;
    });

    return Object.values(map)
      .map(item => ({
        ...item,
        percentage: totalExpenses > 0 ? Number(((item.value / totalExpenses) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [expenses, totalExpenses]);

  const topCategory = categoryData[0];
  const avgExpense = expenses.length > 0 ? totalExpenses / expenses.length : 0;

  // Filtered expenses list
  const filtered = expenses.filter(e => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      e.description.toLowerCase().includes(q) ||
      e.category.toLowerCase().includes(q) ||
      (e.supplierName && e.supplierName.toLowerCase().includes(q)) ||
      (e.reference && e.reference.toLowerCase().includes(q));
    const matchesCategory = selectedCategory === 'All' || e.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Pagination for expenses table
  const [expensesPage, setExpensesPage] = useState(1);
  const expensesPageSize = DEFAULT_PAGE_SIZE;
  const totalFiltered = filtered.length;
  const pagedFiltered = filtered.slice((expensesPage - 1) * expensesPageSize, expensesPage * expensesPageSize);

  const allCategories = ['All', ...categoryData.map(c => c.name)];

  // Custom Tooltip for Pie Chart
  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const color = CATEGORY_COLORS[data.name] || '#64748b';
      return (
        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-2xl border border-slate-800 text-xs z-50 min-w-45">
          <div className="flex items-center gap-2 mb-1.5 pb-1 border-b border-slate-800">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: color }}></span>
            <span className="font-bold text-slate-100">{data.name}</span>
          </div>
          <div className="font-mono font-black text-rose-400 text-sm">
            GH₵ {data.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex justify-between items-center">
            <span>Share: <strong className="text-slate-200">{data.percentage}%</strong></span>
            <span>({data.count} transaction{data.count !== 1 ? 's' : ''})</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pt-2">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-lg shadow-rose-600/30">
            <TrendingDown className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Workshop Expense & Cost Log</h1>
            <p className="text-xs text-slate-500">
              Track operational costs, spare parts, fuel, utilities, salaries, and equipment maintenance
            </p>
          </div>
        </div>

        <button
          onClick={() => onOpenQuickAdd('expense')}
          className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Record Expense</span>
        </button>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Total Expense Volume</span>
            <div className="text-xl font-black text-rose-600 font-mono">
              GH₵ {totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">{expenses.length} Total recorded entries</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <Wallet className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Largest Category</span>
            <div className="text-base font-black text-slate-900 truncate max-w-40">
              {topCategory ? topCategory.name : 'N/A'}
            </div>
            <span className="text-[10px] text-slate-500 font-mono mt-1 block">
              {topCategory ? `GH₵ ${topCategory.value.toLocaleString('en-US', { minimumFractionDigits: 2 })} (${topCategory.percentage}%)` : 'No data'}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Tag className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Average Expense Entry</span>
            <div className="text-xl font-black text-slate-900 font-mono">
              GH₵ {avgExpense.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">Per transaction record</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <BarChart3 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Expense Categories</span>
            <div className="text-xl font-black text-slate-900">
              {categoryData.length} Types
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">Categorized cost centers</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
            <PieChartIcon className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Financial Reporting Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Pie Chart Panel */}
        <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-rose-600" />
                <span>Expenditure by Category</span>
              </h2>
              <p className="text-[11px] text-slate-500">Visual breakdown of workshop costs</p>
            </div>
            {selectedCategory !== 'All' && (
              <button
                onClick={() => setSelectedCategory('All')}
                className="text-[10px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg"
              >
                Reset Filter
              </button>
            )}
          </div>

          {categoryData.length > 0 ? (
            <div className="relative flex-1 flex flex-col items-center justify-center py-2 min-h-65">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                    onMouseEnter={(_, index) => setActivePieIndex(index)}
                    onMouseLeave={() => setActivePieIndex(null)}
                    onClick={(entry) => setSelectedCategory(selectedCategory === entry.name ? 'All' : entry.name)}
                    className="cursor-pointer outline-none"
                  >
                    {categoryData.map((entry, index) => {
                      const color = CATEGORY_COLORS[entry.name] || '#64748b';
                      const isSelected = selectedCategory === entry.name;
                      return (
                        <Cell
                          key={`cell-${index}`}
                          fill={color}
                          stroke="#ffffff"
                          strokeWidth={isSelected ? 3 : 1.5}
                          opacity={selectedCategory !== 'All' && !isSelected ? 0.35 : 1}
                        />
                      );
                    })}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>

              {/* Center Donut Label */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Total</span>
                <span className="text-sm font-black font-mono text-slate-900">
                  GH₵ {totalExpenses > 1000 ? `${(totalExpenses / 1000).toFixed(1)}k` : totalExpenses.toFixed(0)}
                </span>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 text-xs">
              No expense data available to render chart
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 mt-2 flex items-center justify-between text-[11px] text-slate-500">
            <span>Tip: Click on a slice or legend item to filter table</span>
            <span className="font-bold text-slate-700">{categoryData.length} categories</span>
          </div>
        </div>

        {/* Category Breakdown & Progress Bars Panel */}
        <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-rose-600" />
                  <span>Category Cost Distribution</span>
                </h2>
                <p className="text-[11px] text-slate-500">Proportional expenditure share</p>
              </div>
              <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-xl">
                GH₵ {totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="space-y-3.5 max-h-75 overflow-y-auto pr-1">
              {categoryData.map(cat => {
                const color = CATEGORY_COLORS[cat.name] || '#64748b';
                const isSelected = selectedCategory === cat.name;

                return (
                  <div
                    key={cat.name}
                    onClick={() => setSelectedCategory(isSelected ? 'All' : cat.name)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-rose-50/70 border-rose-300 shadow-sm ring-1 ring-rose-300'
                        : 'bg-slate-50/60 border-slate-100 hover:bg-slate-100/80 hover:border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></span>
                        <span className="font-extrabold text-slate-900">{cat.name}</span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          ({cat.count} entry{cat.count !== 1 ? 's' : ''})
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-black text-slate-900">
                          GH₵ {cat.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-[10px] text-slate-500 font-bold ml-2">
                          {cat.percentage}%
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-slate-200/80 rounded-full overflow-hidden">
                      <div
                        className="h-full transition-all duration-500 rounded-full"
                        style={{
                          width: `${Math.max(cat.percentage, 2)}%`,
                          backgroundColor: color,
                        }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Table Section */}
      <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
        {/* Search & Category Tabs */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search description, category, supplier, reference..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {allCategories.map(cat => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Expenses Table */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3.5">Date</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">Description & Supplier</th>
                <th className="p-3.5">Payment Method</th>
                <th className="p-3.5">Reference</th>
                <th className="p-3.5 text-right">Amount (GH₵)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {pagedFiltered.length > 0 ? (
                pagedFiltered.map(exp => {
                  const badgeClass = CATEGORY_BG_BADGES[exp.category] || 'bg-slate-100 text-slate-800 border-slate-200';
                  return (
                    <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 font-mono text-slate-500 whitespace-nowrap">{exp.date}</td>
                      <td className="p-3.5 whitespace-nowrap">
                        <span className={`px-2.5 py-1 font-bold text-[10px] rounded-lg border ${badgeClass}`}>
                          {exp.category}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{exp.description}</div>
                        {exp.supplierName && (
                          <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                            <span>Supplier:</span>
                            <span className="text-slate-700">{exp.supplierName}</span>
                          </div>
                        )}
                      </td>
                      <td className="p-3.5 text-slate-600 whitespace-nowrap">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-semibold rounded-md">
                          {exp.paymentMethod || 'Cash'}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {exp.reference || '—'}
                      </td>
                      <td className="p-3.5 text-right font-black font-mono text-rose-700 text-sm whitespace-nowrap">
                        GH₵ {exp.amount.toFixed(2)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 text-xs">
                    No expense records found matching search filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="p-3">
          <Pagination totalItems={totalFiltered} pageSize={expensesPageSize} currentPage={expensesPage} onPageChange={p => setExpensesPage(p)} compact />
        </div>
      </div>
    </div>
  );
};
