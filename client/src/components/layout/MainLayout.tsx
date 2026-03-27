"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useTheme } from 'next-themes';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';

import {
  LayoutDashboard, Receipt, CreditCard, Settings, Plus, Sun, Moon, LogOut, Newspaper, PieChart, Upload, Menu
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/transactions', label: 'Transactions', icon: Receipt },
  { href: '/cards', label: 'Cards', icon: CreditCard },
  { href: '/budgets', label: 'Budgets', icon: PieChart },
  { href: '/news', label: 'News & AI', icon: Newspaper },
  { href: '/import', label: 'Import CSV', icon: Upload },
  { href: '/settings', label: 'Settings', icon: Settings },
];

function SidebarNav() {
  const pathname = usePathname();
  return (
    <nav className="space-y-2">
      {navItems.map((item) => (
        <Button
          key={item.href}
          asChild
          variant={pathname === item.href ? 'default' : 'ghost'}
          className="w-full justify-start"
        >
          <Link href={item.href}>
            <item.icon className="mr-2 h-4 w-4" />
            {item.label}
          </Link>
        </Button>
      ))}
    </nav>
  );
}


export function MainLayout({ children }: { children: React.ReactNode }) {
  const { setTheme, theme } = useTheme();
  const router = useRouter();

  const handleLogout = () => {
    Cookies.remove('authToken');
    router.push('/login');
  };

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-950 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 hidden md:flex flex-col">
        <div className="p-6">
          <h1 className="text-xl font-bold">CC-Expense</h1>
        </div>
        <div className="flex-1 px-4">
          <SidebarNav />
        </div>
        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
           <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
           </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 h-16 flex items-center justify-between px-4 md:px-8">
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                 <div className="p-6">
                    <h1 className="text-xl font-bold">CC-Expense</h1>
                 </div>
                 <div className="flex-1 px-4">
                    <SidebarNav />
                 </div>
              </SheetContent>
            </Sheet>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-4">
            <Button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              variant="ghost"
              size="icon"
            >
              <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add Expense
            </Button>
          </div>
        </header>

        {/* Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
