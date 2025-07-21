'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from './theme-provider'
import { 
  BarChart3, 
  MessageCircle, 
  Moon, 
  Sun, 
  Home,
  WholeWord 
} from 'lucide-react'
import { clsx } from 'clsx'

const navItems = [
  {
    label: 'Dashboard',
    href: '/',
    icon: BarChart3
  },
  {
    label: 'Conversas',
    href: '/conversas',
    icon: MessageCircle
  }
]

export function Navigation() {
  const pathname = usePathname()
  const { theme, toggleTheme } = useTheme()

  return (
    <nav className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
      <div className="p-6">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
            <WholeWord className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-primary-500">Elis Dashboard</span>
        </div>

        {/* Menu Items */}
        <div className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200',
                  isActive 
                    ? 'bg-primary-50 dark:bg-primary-900 text-primary-600 dark:text-primary-300' 
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            )
          })}
        </div>

        {/* Theme Toggle */}
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 px-4 py-3 rounded-lg w-full text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
          >
            {theme === 'light' ? (
              <Moon className="w-5 h-5" />
            ) : (
              <Sun className="w-5 h-5" />
            )}
            <span className="font-medium">
              {theme === 'light' ? 'Modo Escuro' : 'Modo Claro'}
            </span>
          </button>
        </div>
      </div>
    </nav>
  )
} 