
import React, { useState } from 'react';
import { Purchase, Metal, Currency } from '../types';
import { SYMBOLS, METALS, ICONS, METAL_COLORS } from '../constants';

interface PortfolioProps {
  purchases: Purchase[];
  onAdd: (purchase: Omit<Purchase, 'id'>) => void;
  onDelete: (id: string) => void;
  currentCurrency: Currency;
}

const Portfolio: React.FC<PortfolioProps> = ({ purchases, onAdd, onDelete, currentCurrency }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    metal: 'Gold' as Metal,
    form: 'Coin' as any,
    weight: 1,
    pricePaid: 0,
    currency: 'USD' as Currency,
    date: new Date().toISOString().split('T')[0],
    seller: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd(formData);
    setIsAdding(false);
    setFormData({ ...formData, pricePaid: 0, seller: '' });
  };

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-black tracking-tight">Inventory Ledger</h2>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
        >
          {isAdding ? <ICONS.Trash2 size={18} /> : <ICONS.Plus size={18} />}
          {isAdding ? 'Cancel' : 'Record Position'}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-in zoom-in duration-300 shadow-xl">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Metal Type</label>
            <select 
              className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl p-3 font-bold focus:border-indigo-500 outline-none transition-all"
              value={formData.metal}
              onChange={e => setFormData({ ...formData, metal: e.target.value as Metal })}
            >
              {METALS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Form</label>
            <select 
              className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl p-3 font-bold focus:border-indigo-500 outline-none"
              value={formData.form}
              onChange={e => setFormData({ ...formData, form: e.target.value as any })}
            >
              <option value="Coin">Coin</option>
              <option value="Bar">Bar</option>
              <option value="Nugget">Nugget</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Weight (Grams)</label>
            <input 
              type="number" step="0.01" required
              className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl p-3 font-bold focus:border-indigo-500 outline-none"
              value={formData.weight}
              onChange={e => setFormData({ ...formData, weight: parseFloat(e.target.value) })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Price Paid</label>
            <div className="relative">
               <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">{SYMBOLS[formData.currency]}</span>
               <input 
                type="number" step="0.01" required
                className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl p-3 pl-8 font-bold focus:border-indigo-500 outline-none"
                value={formData.pricePaid}
                onChange={e => setFormData({ ...formData, pricePaid: parseFloat(e.target.value) })}
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Currency</label>
            <select 
              className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl p-3 font-bold focus:border-indigo-500 outline-none"
              value={formData.currency}
              onChange={e => setFormData({ ...formData, currency: e.target.value as Currency })}
            >
              <option value="USD">USD</option>
              <option value="AUD">AUD</option>
              <option value="INR">INR</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Seller Name</label>
            <input 
              type="text" placeholder="e.g. Perth Mint"
              className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl p-3 font-bold focus:border-indigo-500 outline-none"
              value={formData.seller}
              onChange={e => setFormData({ ...formData, seller: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3 flex justify-end gap-3 pt-2">
            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-black uppercase tracking-widest shadow-lg transition-all">
              Save Entry
            </button>
          </div>
        </form>
      )}

      {/* Mobile Stack View / Desktop Table */}
      <div className="space-y-4">
        {purchases.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center">
            <div className="bg-slate-100 dark:bg-slate-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <ICONS.Coins size={32} className="text-slate-400" />
            </div>
            <p className="font-bold text-slate-500 italic">No inventory entries yet for this account.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-1 gap-4">
            {/* Desktop Table View (Hidden on mobile) */}
            <div className="hidden md:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-200 dark:border-slate-800">
                    <th className="px-8 py-5">Date</th>
                    <th className="px-8 py-5">Asset</th>
                    <th className="px-8 py-5">Weight</th>
                    <th className="px-8 py-5">Cost Basis</th>
                    <th className="px-8 py-5">Seller</th>
                    <th className="px-8 py-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {purchases.sort((a,b) => b.date.localeCompare(a.date)).map(p => (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-8 py-6 font-mono text-xs">{p.date}</td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full bg-${METAL_COLORS[p.metal]}`}></div>
                          <span className="font-bold">{p.metal} {p.form}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6 font-bold text-slate-600 dark:text-slate-300">
                        {p.weight}g <span className="text-[10px] text-slate-400 ml-1">({(p.weight / 31.1035).toFixed(3)} oz)</span>
                      </td>
                      <td className="px-8 py-6 font-black text-indigo-600 dark:text-indigo-400">
                        {SYMBOLS[p.currency]}{p.pricePaid.toLocaleString()}
                      </td>
                      <td className="px-8 py-6 text-slate-500 font-medium text-sm">{p.seller || '---'}</td>
                      <td className="px-8 py-6 text-right">
                        <button onClick={() => onDelete(p.id)} className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-all">
                          <ICONS.Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View (Hidden on Desktop) */}
            <div className="md:hidden space-y-4">
              {purchases.map(p => (
                <div key={p.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-sm relative overflow-hidden">
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 bg-${METAL_COLORS[p.metal]}`}></div>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{p.date}</p>
                      <h4 className="font-black text-lg">{p.metal} {p.form}</h4>
                    </div>
                    <button onClick={() => onDelete(p.id)} className="p-2 text-rose-500 bg-rose-50 dark:bg-rose-500/10 rounded-xl">
                      <ICONS.Trash2 size={20} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4 border-t border-slate-50 dark:border-slate-800 pt-4">
                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Weight</span>
                      <p className="font-bold text-slate-700 dark:text-slate-200">{p.weight}g</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Cost</span>
                      <p className="font-black text-indigo-600 dark:text-indigo-400">{SYMBOLS[p.currency]}{p.pricePaid.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <ICONS.Store size={14} className="text-slate-400" />
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-tight">{p.seller || 'Unknown Source'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Portfolio;
