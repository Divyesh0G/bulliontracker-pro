
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
  INR: '₹'
};

export const METAL_COLORS: Record<string, string> = {
  Gold: 'amber-500',
  Silver: 'slate-400',
  Platinum: 'indigo-500',
  Palladium: 'rose-500'
};

export const MOCK_SELLERS = [
  { name: 'ABC Bullion', url: 'https://www.abcbullion.com.au', location: 'Sydney/Melb/Bris', rating: 4.8 },
  { name: 'Perth Mint', url: 'https://www.perthmint.com', location: 'Perth', rating: 4.9 },
  { name: 'Bullion Money', url: 'https://www.bullionmoney.com.au', location: 'Sydney', rating: 4.6 },
  { name: 'Guardian Vaults', url: 'https://www.guardianvaults.com.au', location: 'Melb/Sydney', rating: 4.7 }
];

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Home', icon: <LayoutDashboard size={20} /> },
  { id: 'portfolio', label: 'Stack', icon: <Wallet size={20} /> },
  { id: 'market', label: 'Market', icon: <BarChart3 size={20} /> },
  { id: 'sellers', label: 'Sellers', icon: <Store size={20} /> },
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
  // Added missing Store icon
  Store
};