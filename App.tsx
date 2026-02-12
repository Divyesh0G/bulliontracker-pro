import React, { useCallback, useEffect, useState } from 'react';
import { MetalPrice, Purchase, Currency, ProductComparison, FxRates, User } from './types';
import { NAV_ITEMS, CURRENCIES, SYMBOLS, ICONS, METALS } from './constants';
import Dashboard from './components/Dashboard';
import Portfolio from './components/Portfolio';
import { fetchRealTimePrices, fetchBullionComparisons, fetchFxRates } from './services/geminiService';
import {
  clearAuthToken,
  fetchCurrentUser,
  getAuthToken,
  loginUser,
  logoutUser,
  registerUser,
  saveAuthToken
} from './services/authService';
import { createUserPurchase, deleteUserPurchase, fetchUserPurchases } from './services/portfolioService';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currency, setCurrency] = useState<Currency>('AUD');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'dark';
  });
  const [prices, setPrices] = useState<MetalPrice[]>(() =>
    METALS.map(m => ({ metal: m, rates: { USD: 0, AUD: 0, INR: 0 }, timestamp: Date.now() }))
  );
  const [comparisons, setComparisons] = useState<ProductComparison[]>([]);
  const [fxRates, setFxRates] = useState<FxRates | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [booting, setBooting] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authForm, setAuthForm] = useState({
    name: '',
    email: '',
    password: '',
  });

  useEffect(() => {
    localStorage.setItem('theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const refreshPrices = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [livePrices, compData, fxData] = await Promise.all([
        fetchRealTimePrices(),
        fetchBullionComparisons(),
        fetchFxRates()
      ]);
      setPrices(livePrices);
      setComparisons(compData);
      setFxRates(fxData);
    } catch (error) {
      console.error('Market sync failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const loadPortfolio = useCallback(async (sessionToken: string) => {
    try {
      const records = await fetchUserPurchases(sessionToken);
      setPurchases(records);
    } catch (error) {
      console.error('Failed to load user portfolio:', error);
      setPurchases([]);
    }
  }, []);

  useEffect(() => {
    const boot = async () => {
      try {
        await refreshPrices();
        const storedToken = getAuthToken();
        if (!storedToken) {
          return;
        }
        const currentUser = await fetchCurrentUser(storedToken);
        setToken(storedToken);
        setUser(currentUser);
        await loadPortfolio(storedToken);
      } catch (error) {
        clearAuthToken();
        setToken(null);
        setUser(null);
      } finally {
        setBooting(false);
      }
    };
    boot();
  }, [loadPortfolio, refreshPrices]);

  const handleAuthSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    try {
      const payload = authMode === 'register'
        ? await registerUser(authForm)
        : await loginUser({ email: authForm.email, password: authForm.password });

      saveAuthToken(payload.token);
      setToken(payload.token);
      setUser(payload.user);
      await loadPortfolio(payload.token);
      setAuthForm({ name: '', email: '', password: '' });
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Authentication failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    if (token) {
      await logoutUser(token);
    }
    clearAuthToken();
    setToken(null);
    setUser(null);
    setPurchases([]);
    setActiveTab('dashboard');
  };

  const addPurchase = async (data: Omit<Purchase, 'id'>) => {
    if (!token) return;
    try {
      const created = await createUserPurchase(token, data);
      setPurchases(prev => [created, ...prev]);
    } catch (error) {
      console.error('Failed to create purchase:', error);
    }
  };

  const deletePurchase = async (id: string) => {
    if (!token) return;
    try {
      await deleteUserPurchase(token, id);
      setPurchases(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      console.error('Failed to delete purchase:', error);
    }
  };

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  const getLowestPrice = (offers: ProductComparison['offers']) => {
    return Math.min(...offers.map(o => o.price));
  };

  const convertAudToCurrency = (audPrice: number) => {
    if (currency === 'AUD') {
      return audPrice;
    }
    if (!fxRates) {
      return audPrice;
    }
    const usd = audPrice / fxRates.AUD;
    if (currency === 'USD') {
      return usd;
    }
    return usd * fxRates.INR;
  };

  const renderInventoryAuthGate = () => (
    <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8 items-stretch">
      <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 text-slate-100">
        <p className="text-xs uppercase tracking-[0.25em] text-indigo-300 font-bold mb-4">BullionTracker-Pro</p>
        <h2 className="text-3xl font-black leading-tight mb-4">Inventory access requires account sign-in</h2>
        <p className="text-slate-300 leading-relaxed">
          Market data and dealer quotes stay open for guests. Inventory records are private and isolated per user.
        </p>
        <div className="mt-8 grid grid-cols-1 gap-3 text-sm">
          <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4">Personal ledger per user account</div>
          <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4">Secure write access for buy/sell entries</div>
          <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4">No shared inventory between operators</div>
        </div>
      </div>

      <form onSubmit={handleAuthSubmit} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-[2.5rem] p-10 shadow-2xl border border-slate-200 dark:border-slate-800">
        <h3 className="text-2xl font-black mb-1">{authMode === 'login' ? 'Sign in to continue' : 'Create account'}</h3>
        <p className="text-sm text-slate-500 mb-8">
          {authMode === 'login'
            ? 'Use your credentials to open your private inventory.'
            : 'Register and start managing your personal bullion ledger.'}
        </p>

        {authMode === 'register' && (
          <div className="mb-4">
            <label className="text-[11px] uppercase tracking-[0.2em] font-bold text-slate-500 block mb-2">Full Name</label>
            <input
              type="text"
              required
              value={authForm.name}
              onChange={(e) => setAuthForm(prev => ({ ...prev, name: e.target.value }))}
              className="w-full border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl px-4 py-3 font-semibold outline-none focus:border-indigo-500"
              placeholder="Portfolio Owner"
            />
          </div>
        )}

        <div className="mb-4">
          <label className="text-[11px] uppercase tracking-[0.2em] font-bold text-slate-500 block mb-2">Email</label>
          <input
            type="email"
            required
            value={authForm.email}
            onChange={(e) => setAuthForm(prev => ({ ...prev, email: e.target.value }))}
            className="w-full border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl px-4 py-3 font-semibold outline-none focus:border-indigo-500"
            placeholder="you@example.com"
          />
        </div>

        <div className="mb-6">
          <label className="text-[11px] uppercase tracking-[0.2em] font-bold text-slate-500 block mb-2">Password</label>
          <input
            type="password"
            required
            minLength={8}
            value={authForm.password}
            onChange={(e) => setAuthForm(prev => ({ ...prev, password: e.target.value }))}
            className="w-full border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl px-4 py-3 font-semibold outline-none focus:border-indigo-500"
            placeholder="Minimum 8 characters"
          />
        </div>

        {authError && (
          <div className="mb-4 text-sm font-bold text-rose-600 bg-rose-50 rounded-xl px-4 py-3">
            {authError}
          </div>
        )}

        <button
          type="submit"
          disabled={authLoading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-[0.15em] py-4 rounded-xl transition-all disabled:opacity-50"
        >
          {authLoading ? 'Please wait...' : authMode === 'login' ? 'Sign In' : 'Create Account'}
        </button>

        <button
          type="button"
          onClick={() => {
            setAuthMode(prev => prev === 'login' ? 'register' : 'login');
            setAuthError(null);
          }}
          className="w-full mt-4 text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600"
        >
          {authMode === 'login'
            ? 'Need an account? Register here'
            : 'Already have an account? Sign in'}
        </button>
      </form>
    </div>
  );

  if (booting) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 grid place-items-center">
        <div className="text-center">
          <p className="text-sm uppercase tracking-[0.25em] text-slate-400 font-bold mb-3">BullionTracker-Pro</p>
          <p className="text-xl font-black">Loading workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors duration-300 flex flex-col md:flex-row">
      <aside className="hidden md:flex w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 sticky top-0 h-screen flex-col p-6 z-30 shadow-2xl">
        <div className="flex items-center gap-4 mb-10">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-indigo-600/30">
            B
          </div>
          <div>
            <h1 className="font-black text-xl leading-tight tracking-tight">BullionTracker-Pro</h1>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">Portfolio Intelligence</p>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 ${
                activeTab === item.id
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 font-bold scale-105'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <div className={activeTab === item.id ? 'text-white' : 'text-slate-400'}>
                {item.icon}
              </div>
              <span className="text-sm">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-auto space-y-4">
          <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-200 dark:border-slate-700">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{user ? 'Signed In' : 'Guest Session'}</p>
            <p className="font-black text-sm">{user ? user.name : 'Guest Access'}</p>
            <p className="text-xs text-slate-500">{user ? user.email : 'Inventory editing requires sign in'}</p>
            <div className="flex justify-between items-center mt-4">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Display Currency</span>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                className="bg-transparent font-black text-xs outline-none cursor-pointer text-indigo-600"
              >
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <button
                onClick={toggleTheme}
                className="flex items-center justify-center gap-2 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold shadow-sm"
              >
                {theme === 'dark' ? <ICONS.Sun size={14} /> : <ICONS.Moon size={14} />}
                {theme === 'dark' ? 'Light' : 'Dark'}
              </button>
              {user ? (
                <button
                  onClick={handleLogout}
                  className="py-2.5 border border-rose-200 text-rose-600 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-rose-50"
                >
                  Sign Out
                </button>
              ) : (
                <button
                  onClick={() => setActiveTab('portfolio')}
                  className="py-2.5 border border-indigo-200 text-indigo-600 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-indigo-50"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      </aside>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 px-4 py-3 flex justify-around items-center z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.1)]">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center gap-1 transition-all ${
              activeTab === item.id ? 'text-indigo-600 dark:text-indigo-400 scale-110' : 'text-slate-400'
            }`}
          >
            {item.icon}
            <span className="text-[9px] font-black uppercase tracking-tighter">{item.label}</span>
          </button>
        ))}
      </nav>

      <main className="flex-1 p-5 md:p-10 lg:p-14 overflow-y-auto min-h-screen">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div className="w-full md:w-auto flex justify-between items-center">
            <div>
              <h2 className="text-xs text-slate-500 font-black uppercase tracking-widest mb-1">BullionTracker-Pro</h2>
              <h1 className="text-3xl font-black tracking-tight">{NAV_ITEMS.find(n => n.id === activeTab)?.label}</h1>
              <p className="text-sm text-slate-500 mt-1">Institutional view for your physical metals portfolio operations.</p>
            </div>
            <div className="flex gap-2 items-center">
              {!user && (
                <button
                  onClick={() => setActiveTab('portfolio')}
                  className="md:hidden px-3 py-2 text-xs font-black uppercase tracking-wider border border-indigo-200 text-indigo-600 rounded-xl"
                >
                  Sign In
                </button>
              )}
              <button onClick={toggleTheme} className="md:hidden p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                {theme === 'dark' ? <ICONS.Sun size={20} className="text-amber-400" /> : <ICONS.Moon size={20} className="text-indigo-600" />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl w-full md:w-auto">
            <div className="flex-1 md:flex-none flex items-center gap-3 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 border-r border-slate-100 dark:border-slate-800">
              <span className="relative flex h-2.5 w-2.5">
                <span className={`${isRefreshing ? 'animate-ping' : ''} absolute inline-flex h-full w-full rounded-full ${isRefreshing ? 'bg-indigo-400' : 'bg-emerald-400'} opacity-75`}></span>
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isRefreshing ? 'bg-indigo-500' : 'bg-emerald-500'}`}></span>
              </span>
              {isRefreshing ? 'Refreshing Feeds' : 'Feeds Online'}
            </div>
            <button
              onClick={refreshPrices}
              disabled={isRefreshing}
              className="p-3 text-slate-400 hover:text-indigo-600 transition-all active:scale-90"
            >
              <ICONS.RefreshCw size={20} className={isRefreshing ? 'animate-spin text-indigo-500' : ''} />
            </button>
          </div>
        </header>

        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-24 md:pb-0">
          {activeTab === 'dashboard' && <Dashboard prices={prices} portfolio={purchases} currency={currency} theme={theme} />}
          {activeTab === 'portfolio' && (
            user
              ? <Portfolio purchases={purchases} onAdd={addPurchase} onDelete={deletePurchase} currentCurrency={currency} />
              : renderInventoryAuthGate()
          )}
          {activeTab === 'market' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
              {prices.map(price => (
                <div key={price.metal} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-[2.5rem] shadow-sm hover:shadow-2xl hover:border-indigo-500/30 transition-all duration-500">
                  <div className="flex justify-between items-start mb-8">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700">
                      {price.metal.substring(0, 2)}
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Market Source</span>
                      <p className="text-[10px] font-mono font-bold text-indigo-500">Yahoo Finance</p>
                    </div>
                  </div>
                  <h3 className="text-2xl font-black mb-6">{price.metal}</h3>
                  <div className="space-y-4">
                    {CURRENCIES.map(curr => (
                      <div key={curr} className="flex justify-between items-center group">
                        <span className="font-bold text-xs text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors">{curr}</span>
                        <span className="text-lg font-mono font-black">
                          {price.rates[curr] === 0 ? '---' : `${SYMBOLS[curr]}${price.rates[curr].toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          {activeTab === 'sellers' && (
            <div className="space-y-12">
              {comparisons.length === 0 ? (
                <div className="py-32 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[3rem] shadow-inner">
                  <div className="animate-bounce inline-block bg-indigo-50 dark:bg-indigo-950/30 p-6 rounded-full mb-6">
                    <ICONS.History className="text-indigo-600" size={40} />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 mb-2">Dealer quotes are syncing</h3>
                  <p className="text-slate-500 text-sm max-w-xs mx-auto">Pulling current offers from Australian bullion dealers.</p>
                </div>
              ) : (
                comparisons.map((product, idx) => {
                  const lowest = getLowestPrice(product.offers);
                  const spot = prices.find(p => p.metal === product.metal)?.rates[currency] || 0;
                  const spotValue = spot * product.weightOz;

                  return (
                    <section key={idx} className="space-y-6">
                      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-l-8 border-indigo-600 pl-6">
                        <div>
                          <h4 className="font-black text-2xl tracking-tighter uppercase">{product.productName}</h4>
                          <p className="text-xs text-slate-500 font-bold tracking-widest uppercase mt-1">Quoted against live spot benchmark</p>
                        </div>
                        <div className="text-left sm:text-right bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-2xl inline-block">
                          <span className="text-[9px] text-slate-500 font-black uppercase block mb-0.5">Spot Reference</span>
                          <span className="font-mono text-indigo-600 dark:text-indigo-400 font-black text-lg">{SYMBOLS[currency]}{spotValue.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                        {product.offers.sort((a, b) => a.price - b.price).map((offer, oIdx) => {
                          const convertedPrice = convertAudToCurrency(offer.price);
                          const premiumPct = spotValue > 0 ? ((convertedPrice - spotValue) / spotValue) * 100 : 0;
                          const isBest = offer.price === lowest;
                          return (
                            <div key={oIdx} className={`group relative p-8 rounded-[2.5rem] border-2 transition-all duration-500 flex flex-col ${isBest ? 'bg-indigo-600 border-indigo-600 text-white shadow-[0_20px_50px_rgba(79,70,229,0.3)] scale-105 z-10' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-500/30'}`}>
                              {isBest && <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-white text-indigo-600 text-[10px] font-black px-4 py-1.5 rounded-full uppercase shadow-xl ring-4 ring-indigo-600/20">Best Quote</div>}
                              <h5 className={`text-[11px] font-black uppercase tracking-[0.2em] mb-4 ${isBest ? 'text-indigo-200' : 'text-slate-400'}`}>{offer.sellerName}</h5>
                              <p className="text-3xl font-black mb-1 font-mono">{SYMBOLS[currency]}{convertedPrice.toLocaleString()}</p>
                              <div className={`text-xs font-black mt-2 inline-flex items-center gap-1.5 ${isBest ? 'text-indigo-100' : premiumPct < 3 ? 'text-emerald-500' : 'text-amber-500'}`}>
                                <ICONS.Plus size={12} /> {premiumPct.toFixed(2)}% Premium
                              </div>
                              <a href={offer.url} target="_blank" rel="noopener" className={`mt-8 block text-center py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${isBest ? 'bg-white text-indigo-600 hover:bg-slate-100' : 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-500'}`}>
                                Open Dealer
                              </a>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  );
                })
              )}
            </div>
          )}
        </div>
      </main>

      <div className="fixed bottom-24 md:bottom-10 right-6 flex flex-col gap-4 z-40">
        <button
          onClick={refreshPrices}
          disabled={isRefreshing}
          className="w-14 h-14 bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 rounded-2xl shadow-2xl flex items-center justify-center border border-slate-200 dark:border-slate-800 transition-transform active:scale-90 hover:rotate-180"
        >
          <ICONS.RefreshCw size={24} className={isRefreshing ? 'animate-spin' : ''} />
        </button>
      </div>
    </div>
  );
};

export default App;
