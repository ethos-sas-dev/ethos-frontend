// Tipos de roles de usuario
export type UserRole = 'Jefe Operativo' | 'Administrador' | 'Directorio' | 'Propietario' | 'Arrendatario'

// Información de usuario extendida con ID de perfil y metadatos de Supabase
export interface UserData {
  id: string; // ID de auth.users (UUID)
  profileId: number | null; // ID de perfiles_cliente o perfiles_operacional (INT)
  email: string;
  role?: UserRole;
  nombre?: string;
  apellido?: string;
  perfil_cliente?: {
    documentId: string; // Este parece ser el ID de perfil nuevamente, revisar si es necesario
    tipo_persona?: string;
  };
  metadata?: Record<string, any>;
}

export interface User {
  id: string
  email: string
  role: UserRole
  firstName?: string
  lastName?: string
  phone?: string
  createdAt: string
  updatedAt: string
}

export interface Property {
  id: string
  name: string
  address: string
  projectId: string
  ownerId: string
  status: 'active' | 'inactive' | 'pending'
  type: 'apartment' | 'house' | 'commercial' | 'office' | 'other'
  details: {
    size?: number
    rooms?: number
    bathrooms?: number
    [key: string]: any
  }
  createdAt: string
  updatedAt: string
}

export interface Project {
  id: string
  name: string
  address: string
  description: string
  status: 'planning' | 'construction' | 'completed' | 'inactive'
  details: {
    units?: number
    startDate?: string
    endDate?: string
    [key: string]: any
  }
  createdAt: string
  updatedAt: string
}

export interface Request {
  id: string
  type: 'maintenance' | 'billing' | 'info' | 'complaint' | 'other'
  status: 'pending' | 'procesando' | 'completada' | 'rechazada'
  description: string
  propertyId?: string
  userId: string
  assignedTo?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  createdAt: string
  updatedAt: string
  resolvedAt?: string
}

export interface Invoice {
  id: string
  userId: string
  propertyId?: string
  amount: number
  status: 'pending' | 'paid' | 'overdue' | 'cancelled'
  dueDate: string
  paidDate?: string
  details: {
    concept: string
    period?: string
    [key: string]: any
  }
  createdAt: string
  updatedAt: string
}

export interface MenuItem {
  title: string
  href: string
  icon: any
}

export interface MenuItems {
  items: MenuItem[]
} 