import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  BarChart3,
  Store,
  Plus,
  Trash2,
  RefreshCw,
  Coins,
  History,
  LayoutDashboard,
  Sun,
  Moon,
  ChevronRight,
  Filter
} from 'lucide-react';

export const CURRENCIES = ['USD', 'AUD', 'INR'] as const;
export const METALS = ['Gold', 'Silver', 'Platinum', 'Palladium'] as const;

export const SYMBOLS: Record<string, string> = {
  USD: '$',
  AUD: 'A$',
  INR: 'Rs '
};

export const METAL_COLORS: Record<string, string> = {
  Gold: 'amber-500',
  Silver: 'slate-400',
  Platinum: 'indigo-500',
  Palladium: 'rose-500'
};

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Overview', icon: <LayoutDashboard size={20} /> },
  { id: 'portfolio', label: 'Inventory', icon: <Wallet size={20} /> },
  { id: 'market', label: 'Spot Desk', icon: <BarChart3 size={20} /> },
  { id: 'sellers', label: 'Dealer Quotes', icon: <Store size={20} /> },
];

export const ICONS = {
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  RefreshCw,
  Coins,
  History,
  Sun,
  Moon,
  ChevronRight,
  Filter,
  Store
};
