import React from 'react';
import { 
  LayoutDashboard, Receipt, ShoppingCart, UtensilsCrossed, ChefHat, 
  Waves, PackageCheck, ReceiptText, FileBarChart, Settings, Users, ShieldCheck,
  Package, Boxes, Utensils, BookOpen, MessageSquare, Bell, CheckSquare,
  UserCheck, Banknote, Briefcase, CreditCard, KeyRound, Globe
} from 'lucide-react';
import { UserRole } from '../types';
import { Language, getTranslation } from '../lib/translations';

export type TabType = 
  | 'dashboard' 
  | 'order_center'
  | 'accountant_control'
  | 'pos' 
  | 'tables' 
  | 'kitchen' 
  | 'ingredients'
  | 'recipe_management'
  | 'menu_management'
  | 'pool_sauna' 
  | 'stock' 
  | 'shifts'
  | 'report' 
  | 'hr_payroll'
  | 'whatsapp_reports'
  | 'notifications'
  | 'approvals'
  | 'subscriptions'
  | 'saas_admin'
  | 'products_services'
  | 'users'
  | 'audit_logs'
  | 'settings';

interface NavigationProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  pendingKitchenCount: number;
  unpaidOrdersCount?: number;
  lowStockCount: number;
  userRole: UserRole;
  darkMode: boolean;
  language?: Language;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  setActiveTab,
  pendingKitchenCount,
  unpaidOrdersCount = 0,
  lowStockCount,
  userRole,
  darkMode,
  language = 'rw'
}) => {
  const isManagerOrAdmin = userRole === 'Manager' || userRole === 'Super Admin' || userRole === 'Admin' || userRole === 'Accountant';
  const isSuperAdmin = userRole === 'Super Admin';
  const t = getTranslation(language);

  const navItems = [
    { id: 'dashboard' as TabType, label: t.dashboard, icon: LayoutDashboard },
    { 
      id: 'order_center' as TabType, 
      label: t.orderCenter, 
      icon: Receipt,
      badge: unpaidOrdersCount > 0 ? unpaidOrdersCount : null,
      badgeColor: 'bg-amber-500 text-white'
    },
    { id: 'accountant_control' as TabType, label: 'Accountant Control', icon: Briefcase, managerOnly: true },
    { id: 'pos' as TabType, label: t.pos, icon: ShoppingCart },
    { id: 'tables' as TabType, label: t.tables, icon: UtensilsCrossed },
    { 
      id: 'kitchen' as TabType, 
      label: t.kitchen, 
      icon: ChefHat, 
      badge: pendingKitchenCount > 0 ? pendingKitchenCount : null,
      badgeColor: 'bg-rose-500 text-white'
    },
    { id: 'ingredients' as TabType, label: 'Ingredients', icon: Boxes },
    { id: 'recipe_management' as TabType, label: 'Recipes', icon: Utensils },
    { id: 'menu_management' as TabType, label: 'Menu', icon: BookOpen },
    { id: 'pool_sauna' as TabType, label: t.poolSauna, icon: Waves },
    { 
      id: 'stock' as TabType, 
      label: t.barStock, 
      icon: PackageCheck,
      badge: lowStockCount > 0 ? lowStockCount : null,
      badgeColor: 'bg-amber-500 text-white'
    },
    { id: 'shifts' as TabType, label: t.shifts, icon: ReceiptText },
    { id: 'report' as TabType, label: t.dailyReport, icon: FileBarChart },
    { id: 'hr_payroll' as TabType, label: 'HR & Payroll', icon: UserCheck, managerOnly: true },
    { id: 'whatsapp_reports' as TabType, label: 'WhatsApp Automation', icon: MessageSquare, managerOnly: true },
    { id: 'notifications' as TabType, label: 'Notifications', icon: Bell },
    { id: 'approvals' as TabType, label: 'Approvals Engine', icon: CheckSquare },
    { id: 'subscriptions' as TabType, label: 'Payments & Subscription', icon: CreditCard, managerOnly: true },
    { id: 'saas_admin' as TabType, label: 'SaaS Super Admin', icon: KeyRound, superAdminOnly: true },
    { id: 'products_services' as TabType, label: t.productsServices, icon: Package, managerOnly: true },
    { id: 'users' as TabType, label: t.userAdmin, icon: Users, managerOnly: true },
    { id: 'audit_logs' as TabType, label: t.auditLogs, icon: ShieldCheck, managerOnly: true },
    { id: 'settings' as TabType, label: t.settings, icon: Settings, managerOnly: true },
  ];

  return (
    <nav className={`border-b sticky top-16 z-20 transition-colors ${
      darkMode 
        ? 'bg-slate-900/95 border-slate-800 text-slate-300 backdrop-blur-md' 
        : 'bg-slate-50/95 border-slate-200 text-slate-700 backdrop-blur-md'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-1 sm:space-x-2 overflow-x-auto no-scrollbar py-2">
          {navItems.map((item) => {
            if (item.superAdminOnly && !isSuperAdmin) return null;
            if (item.managerOnly && !isManagerOrAdmin) return null;
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold'
                    : darkMode
                      ? 'hover:bg-slate-800 text-slate-300'
                      : 'hover:bg-slate-200/60 text-slate-700'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-slate-500 dark:text-slate-400'}`} />
                <span>{item.label}</span>
                {item.badge !== null && item.badge !== undefined && (
                  <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

