'use client'

import { motion } from "framer-motion"
import { ArrowRightCircleIcon } from "@heroicons/react/24/outline"

type RequestStatus = 'pendiente' | 'procesando' | 'completada' | 'rechazada'

interface RequestCardProps {
  type: string
  status: RequestStatus
  date: string
  description: string
}

export default function RequestCard({
  type,
  status,
  date,
  description
}: RequestCardProps) {
  const statusColors = {
    pendiente: 'bg-amber-100 text-amber-800',
    procesando: 'bg-blue-100 text-blue-800',
    completada: 'bg-emerald-100 text-emerald-800',
    rechazada: 'bg-red-100 text-red-800'
  }
  
  return (
    <motion.div 
      className="bg-white rounded-xl shadow-sm p-6 cursor-pointer relative overflow-hidden group"
      whileHover={{ y: -2, boxShadow: '0 10px 30px -12px rgba(0, 0, 0, 0.1)' }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-medium">{type}</h3>
        <span className={`text-xs px-2.5 py-1 rounded-full ${statusColors[status]}`}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      </div>
      <p className="text-sm text-gray-500 mb-3">{description}</p>
      <p className="text-xs text-gray-400">Fecha: {date}</p>
      
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-emerald-600 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></div>
      
      <div className="mt-4 pt-3 border-t flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <span className="text-sm font-medium text-emerald-600">Ver solicitud</span>
        <ArrowRightCircleIcon className="w-5 h-5 text-emerald-600 group-hover:translate-x-1 transition-transform duration-300" />
      </div>
    </motion.div>
  )
} 