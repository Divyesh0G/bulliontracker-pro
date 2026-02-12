
import React, { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MetalPrice, Purchase, Currency, Metal } from '../types';
import { SYMBOLS, ICONS, METAL_COLORS, METALS } from '../constants';

interface DashboardProps {
  prices: MetalPrice[];
  portfolio: Purchase[];
  currency: Currency;
  // Added theme to handle component-level styling like Recharts
  theme: 'light' | 'dark';
}

const Dashboard: React.FC<DashboardProps> = ({ prices, portfolio, currency, theme }) => {
  const [visibleMetals, setVisibleMetals] = useState<Record<Metal, boolean>>({
    Gold: true,
    Silver: true,
    Platinum: true,
    Palladium: true
  });

  const getMetalPrice = (metal: Metal) => prices.find(p => p.metal === metal)?.rates[currency] || 0;

  const calculateStats = (metal: Metal) => {
    const relevant = portfolio.filter(p => p.metal === metal);
    const weightGrams = relevant.reduce((sum, p) => sum + p.weight, 0);
    const cost = relevant.reduce((sum, p) => sum + p.pricePaid, 0);
    const currentPrice = getMetalPrice(metal);
    const ozWeight = weightGrams / 31.1035;
    const currentValue = ozWeight * currentPrice;
    const profit = currentValue - cost;
    const profitPct = cost > 0 ? (profit / cost) * 100 : 0;
    const avgPrice = ozWeight > 0 ? cost / ozWeight : 0;

    return { weightGrams, cost, currentValue, profit, profitPct, avgPrice };
  };

  const allStats = METALS.map(m => ({ metal: m, ...calculateStats(m) }));
  const totalValue = allStats.reduce((sum, s) => sum + s.currentValue, 0);
  const totalCost = allStats.reduce((sum, s) => sum + s.cost, 0);
  const totalProfit = totalValue - totalCost;

  const chartData = useMemo(() => {
    return Array.from({ length: 10 }).map((_, i) => {
      const dataPoint: any = { name: `Point ${i + 1}` };
      METALS.forEach(m => {
        const base = getMetalPrice(m);
        const trend = Math.sin(i * 0.8) * 0.04;
        dataPoint[m] = base > 0 ? base * (1 + trend + (Math.random() * 0.02)) : 0;
      });
      return dataPoint;
    });
  }, [prices, currency]);

  const toggleMetal = (metal: Metal) => {
    setVisibleMetals(prev => ({ ...prev, [metal]: !prev[metal] }));
  };

  const METAL_HEX: Record<Metal, string> = {
    Gold: '#f59e0b',
    Silver: '#94a3b8',
    Platinum: '#6366f1',
    Palladium: '#f43f5e'
  };

  return (
    <div className="space-y-8">
      {/* Stat Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-indigo-600 p-8 rounded-[2.5rem] shadow-2xl shadow-indigo-600/30 text-white">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70 mb-2">Net Portfolio Value</h3>
          <p className="text-3xl font-black mb-1">{SYMBOLS[currency]}{totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          <div className="flex items-center gap-2 text-xs font-bold mt-4 bg-white/20 w-fit px-3 py-1 rounded-full">
            {totalProfit >= 0 ? <ICONS.TrendingUp size={14} /> : <ICONS.TrendingDown size={14} />}
            {Math.abs(totalCost > 0 ? (totalProfit/totalCost)*100 : 0).toFixed(1)}% Return vs Cost
          </div>
        </div>

        {METALS.map(m => {
          const stats = calculateStats(m);
          return (
            <div key={m} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-[2.5rem] shadow-sm flex flex-col justify-between group hover:border-indigo-500/30 transition-all">
              <div>
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">{m} Spot Benchmark</h3>
                <p className="text-2xl font-black font-mono tracking-tight">{SYMBOLS[currency]}{getMetalPrice(m).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="mt-6 pt-6 border-t border-slate-50 dark:border-slate-800">
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Holding Size</p>
                <p className="font-bold text-slate-600 dark:text-slate-300">{(stats.weightGrams / 31.1035).toFixed(2)} oz</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Trend Section */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-[3rem] shadow-sm relative overflow-hidden">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10">
            <div>
              <h3 className="text-xl font-black">Market Pulse</h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Illustrative trend overlay by metal</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {METALS.map(m => (
                <button
                  key={m}
                  onClick={() => toggleMetal(m)}
                  className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${
                    visibleMetals[m] 
                    ? `bg-slate-900 dark:bg-slate-100 border-slate-900 dark:border-slate-100 text-white dark:text-slate-900` 
                    : 'bg-transparent border-slate-100 dark:border-slate-800 text-slate-300 dark:text-slate-600'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  {METALS.map(m => (
                    <linearGradient key={`grad-${m}`} id={`color${m}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={METAL_HEX[m]} stopOpacity={0.2}/>
                      <stop offset="95%" stopColor={METAL_HEX[m]} stopOpacity={0}/>
                    </linearGradient>
                  ))}
                </defs>
                {/* Fixed invalid dark:stroke prop and used theme conditional */}
                <CartesianGrid strokeDasharray="5 5" stroke={theme === 'dark' ? '#1e293b' : '#f1f5f9'} vertical={false} />
                <XAxis hide dataKey="name" />
                <YAxis 
                  stroke="#94a3b8" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(val) => `${SYMBOLS[currency]}${val.toLocaleString()}`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: theme === 'dark' ? '#0f172a' : 'rgba(255, 255, 255, 0.95)', 
                    borderRadius: '24px',
                    border: 'none',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                    color: theme === 'dark' ? '#f8fafc' : '#1e293b'
                  }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                />
                {METALS.map(m => visibleMetals[m] && (
                  <Area 
                    key={m}
                    type="monotone" 
                    dataKey={m} 
                    stroke={METAL_HEX[m]} 
                    strokeWidth={4}
                    fillOpacity={1} 
                    fill={`url(#color${m})`}
                    animationDuration={2000}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* DCA Opportunity Panel */}
        <div className="bg-slate-900 dark:bg-white p-8 rounded-[3rem] shadow-2xl text-white dark:text-slate-900">
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-indigo-600 p-2.5 rounded-2xl text-white">
              <ICONS.Filter size={20} />
            </div>
            <h3 className="text-xl font-black">DCA Insights</h3>
          </div>
          
          <div className="space-y-6">
            {allStats.map(stat => {
              const spot = getMetalPrice(stat.metal);
              const isOpportunity = spot > 0 && stat.avgPrice > 0 && spot < stat.avgPrice;
              
              return (
                <div key={stat.metal} className={`p-6 rounded-[2rem] border-2 transition-all ${isOpportunity ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/5 dark:bg-slate-50 border-white/10 dark:border-slate-200'}`}>
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-black uppercase tracking-[0.15em] text-xs">{stat.metal}</span>
                    {isOpportunity && <span className="text-[9px] font-black uppercase bg-emerald-500 text-white px-2 py-1 rounded-lg">Below Avg Entry</span>}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[9px] font-bold uppercase opacity-50 block mb-1">Spot / Oz</span>
                      <p className="font-mono font-black text-sm">{SYMBOLS[currency]}{spot.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] font-bold uppercase opacity-50 block mb-1">Avg Entry / Oz</span>
                      <p className="font-mono font-black text-sm">{SYMBOLS[currency]}{stat.avgPrice.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="mt-8 p-6 bg-indigo-600 rounded-[2rem] text-white/90 text-xs font-bold leading-relaxed">
            Signals compare your recorded cost basis against current spot benchmarks and are not financial advice.
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
