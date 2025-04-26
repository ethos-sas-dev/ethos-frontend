'use client'

import { motion } from "framer-motion"
import { ArrowRightCircleIcon } from "@heroicons/react/24/outline"

interface StatCardProps {
  title: string
  value: string | number
  icon: any
  iconColor: string
  href?: string
}

export default function StatCard({
  title,
  value,
  icon: Icon,
  iconColor,
  href = '#'
}: StatCardProps) {
  return (
    <motion.div 
      className="bg-white rounded-xl shadow-sm p-6 cursor-pointer relative overflow-hidden group"
      whileHover={{ y: -2, boxShadow: '0 10px 30px -12px rgba(0, 0, 0, 0.1)' }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{title}</p>
          <h3 className="text-2xl font-semibold">{value}</h3>
        </div>
        <div className={`p-3 rounded-full ${iconColor} text-white`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-emerald-600 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></div>
      
      <div className="mt-4 pt-3 border-t flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <span className="text-sm font-medium text-emerald-600">Ver detalles</span>
        <ArrowRightCircleIcon className="w-5 h-5 text-emerald-600 group-hover:translate-x-1 transition-transform duration-300" />
      </div>
    </motion.div>
  )
} 