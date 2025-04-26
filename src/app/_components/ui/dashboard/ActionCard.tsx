'use client'

import { motion } from "framer-motion"
import { ArrowRightCircleIcon } from "@heroicons/react/24/outline"

interface ActionCardProps {
  title: string
  description: string
  icon: any
  href?: string
  bgColor?: string
  textColor?: string
}

export default function ActionCard({
  title,
  description,
  icon: Icon,
  href = '#',
  bgColor = "bg-emerald-50",
  textColor = "text-gray-600"
}: ActionCardProps) {
  const titleColor = textColor.includes('white') ? textColor : 'text-gray-900';
  const iconColor = textColor.includes('white') ? textColor : 'text-emerald-600';
  const linkColor = textColor.includes('white') ? textColor : 'text-emerald-600';
  const borderColor = textColor.includes('white') ? 'border-white/20' : 'border-emerald-100';
  const arrowColor = linkColor;

  return (
    <motion.div 
      className={`${bgColor} rounded-xl p-6 cursor-pointer relative overflow-hidden group`}
      whileHover={{ y: -2, boxShadow: '0 10px 20px -8px rgba(0, 0, 0, 0.1)' }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-full ${textColor.includes('white') ? 'bg-white/20' : 'bg-white/80'} backdrop-blur-sm`}>
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
        <div>
          <h3 className={`text-lg font-medium mb-1 ${titleColor}`}>{title}</h3>
          <p className={`text-sm ${textColor}`}>{description}</p>
        </div>
      </div>
      
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-emerald-600 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></div>
      
      <div className={`mt-4 pt-3 border-t ${borderColor} flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity duration-300`}>
        <span className={`text-sm font-medium ${linkColor}`}>Comenzar</span>
        <ArrowRightCircleIcon className={`w-5 h-5 ${arrowColor} group-hover:translate-x-1 transition-transform duration-300`} />
      </div>
    </motion.div>
  )
} 