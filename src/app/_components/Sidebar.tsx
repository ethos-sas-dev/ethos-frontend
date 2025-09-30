'use client'

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import { UserRole, MenuItem } from '../_lib/types'
import { 
  ArrowLeftOnRectangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline"

interface SidebarProps {
  items: MenuItem[]
  role: UserRole
  logout: () => Promise<void>
  user: any
  isCollapsed: boolean
  toggleSidebar: () => void
}

export default function Sidebar({ 
  items, 
  role, 
  logout, 
  user, 
  isCollapsed, 
  toggleSidebar 
}: SidebarProps) {
  const pathname = usePathname()
  
  // Filtrar elementos del menú según el usuario si es necesario
  const filteredItems = items.filter(item => {
    // Por ejemplo, mostrar ciertos elementos solo a usuarios específicos
    if (item.href === "/dashboard/admin" && user?.email !== 'admin@ethos.com') {
      return false;
    }
    return true;
  });

  return (
    <motion.aside 
      initial={false}
      animate={{ 
        width: isCollapsed ? 80 : 280 
      }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="fixed h-screen backdrop-blur-sm bg-gradient-to-br from-[#05703f] via-[#024728] to-[#01231a] text-white shadow-2xl border-r border-white/5"
    >
      <motion.nav 
        className="flex flex-col h-full relative"
        initial={{ x: -294, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <button 
          onClick={toggleSidebar}
          className="absolute -right-3 bottom-24 bg-gradient-to-r from-[#008A4B]/70 to-[#006837]/70 rounded-full p-1.5 shadow-md hover:shadow-lg cursor-pointer transition-all duration-300 z-10 backdrop-blur-sm"
        >
          {isCollapsed ? (
            <ChevronRightIcon className="w-4 h-4 text-white" />
          ) : (
            <ChevronLeftIcon className="w-4 h-4 text-white" />
          )}
        </button>

        <div className={`pt-8 ${isCollapsed ? 'px-0 flex justify-center' : 'pl-6'} pb-8 flex items-center gap-4`}>
          <div className="w-[40px] h-[40px] rounded-full bg-white flex items-center justify-center">
            <span className="font-bold text-[#008A4B]">E</span>
          </div>
          {!isCollapsed && (
            <motion.div 
              className="flex flex-col"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <span className="font-semibold text-sm tracking-tight truncate max-w-[180px]">{user?.email}</span>
              <span className="text-sm text-white/70">{role}</span>
            </motion.div>
          )}
        </div>

        <ul className={`flex-1 space-y-1 ${isCollapsed ? 'px-2' : 'p-4'}`}>
          {filteredItems.map((item) => {
            const isActive = item.href === "/dashboard" 
              ? pathname === item.href 
              : pathname.startsWith(item.href);

            return (
              <li key={item.href}>
                <Link 
                  href={item.href} 
                  className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''} px-4 py-3 rounded-xl transition-all duration-300 relative overflow-hidden group
                    ${isActive 
                      ? 'bg-white/15 text-white' 
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }
                  `}
                  title={isCollapsed ? item.title : ""}
                >
                  <item.icon className={`w-6 h-6 transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-white' : 'text-white/70'}`} />
                  {!isCollapsed && (
                    <motion.span 
                      className="font-medium tracking-wide"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      {item.title}
                    </motion.span>
                  )}
                  {isActive && (
                    <motion.div
                      className="absolute left-0 w-1.5 h-8 bg-white rounded-r-full shadow-lg shadow-white/20"
                      layoutId="activeIndicator"
                      transition={{ 
                        type: "spring",
                        stiffness: 300,
                        damping: 30
                      }}
                    />
                  )}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    initial={false}
                  />
                </Link>
              </li>
            )
          })}
        </ul>

        <div className={`${isCollapsed ? 'px-2 pb-6' : 'p-4 pb-6'} border-t border-white/10`}>
          <button 
            onClick={logout}
            className={`w-full bg-gradient-to-r from-[#008A4B] to-[#006837] text-white py-3.5 ${isCollapsed ? 'px-2 mt-4' : 'px-4 mt-4'} rounded-xl font-medium
              hover:from-[#006837] hover:to-[#004d29] transition-all duration-300 flex items-center ${isCollapsed ? 'justify-center' : 'justify-center gap-2'} group shadow-lg shadow-[#008A4B]/20`}
            title={isCollapsed ? "Cerrar sesión" : ""}
          >
            <ArrowLeftOnRectangleIcon className="w-5 h-5 transition-transform duration-300 group-hover:-translate-x-1" />
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                Cerrar sesión
              </motion.span>
            )}
          </button>
        </div>
      </motion.nav>
    </motion.aside>
  )
} 