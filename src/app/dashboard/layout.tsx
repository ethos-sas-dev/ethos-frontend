'use client'

import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { useAuth } from '../_lib/auth/AuthContext'
import { UserRole } from '../_lib/types'
import { menuItems } from '../_lib/menus'
import ProtectedRoute from '../_components/ProtectedRoute'
import Sidebar from '../_components/Sidebar'
import { useState } from 'react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, role, logout } = useAuth()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const router = useRouter()

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  if (!user || !role) {
    return null
  }

  // Verificar si el rol es válido
  if (!menuItems[role]) {
    console.log('Rol no válido:', role)
    return null
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex overflow-hidden bg-gray-100">
        <Sidebar 
          items={menuItems[role]} 
          role={role} 
          logout={logout} 
          user={user} 
          isCollapsed={!isSidebarOpen}
          toggleSidebar={toggleSidebar}
        />
        <motion.div 
          className="flex-1 overflow-auto"
          initial={false}
          animate={{ 
            marginLeft: isSidebarOpen ? 294 : 80 
          }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          <main className="p-8 min-h-screen">{children}</main>
        </motion.div>
      </div>
    </ProtectedRoute>
  )
} 