import { MenuItems, UserRole } from './types'
import { 
  HomeIcon, 
  BuildingOffice2Icon,
  UserGroupIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  CurrencyDollarIcon,
  BuildingStorefrontIcon,
  EnvelopeIcon,
  ChartBarIcon,
  ChatBubbleBottomCenterTextIcon,
} from "@heroicons/react/24/outline"
import { UserCircle } from "lucide-react"

// Configuración de menús específicos por rol
export const menuItems: Record<UserRole, MenuItems['items']> = {
  'Jefe Operativo': [
    {
      title: "Inicio",
      icon: HomeIcon,
      href: "/dashboard"
    },
    {
      title: "Proyectos",
      icon: BuildingOffice2Icon,
      href: "/dashboard/proyectos"
    },
    {
      title: "Clientes",
      icon: UserGroupIcon,
      href: "/dashboard/clientes"
    },
    {
      title: "Reportes",
      icon: ChartBarIcon,
      href: "/dashboard/reportes"
    }
  ],
  'Administrador': [
    {
      title: "Inicio",
      icon: HomeIcon,
      href: "/dashboard"
    },
    {
      title: "Proyectos",
      icon: BuildingOffice2Icon,
      href: "/dashboard/proyectos"
    },
    {
      title: "Clientes",
      icon: UserGroupIcon,
      href: "/dashboard/clientes"
    },
    {
      title: "Correos",
      icon: EnvelopeIcon,
      href: "/dashboard/correos"
    },
    {
      title: "Usuarios",
      icon: UserCircle,
      href: "/dashboard/usuarios"
    },
    {
      title: "Reportes",
      icon: ChartBarIcon,
      href: "/dashboard/reportes"
    },
    {
      title: "Facturación y Cobranza",
      icon: CurrencyDollarIcon,
      href: "/dashboard/facturacion-cobranza"
    },
    {
      title: "Mesa de Ayuda",
      icon: ChatBubbleBottomCenterTextIcon,
      href: "/dashboard/mesa-de-ayuda"
    }
  ],
  'Directorio': [
    {
      title: "Inicio",
      icon: HomeIcon,
      href: "/dashboard"
    },
    {
      title: "Proyectos",
      icon: BuildingOffice2Icon,
      href: "/dashboard/proyectos"
    },
    {
      title: "Clientes",
      icon: UserGroupIcon,
      href: "/dashboard/clientes"
    },
    {
      title: "Usuarios",
      icon: UserCircle,
      href: "/dashboard/usuarios"
    },
    {
      title: "Reportes",
      icon: ChartBarIcon,
      href: "/dashboard/reportes"
    },
    {
      title: "Facturación y Cobranza",
      icon: CurrencyDollarIcon,
      href: "/dashboard/facturacion-cobranza"
    },
    {
      title: "Mesa de Ayuda",
      icon: ChatBubbleBottomCenterTextIcon,
      href: "/dashboard/mesa-de-ayuda"
    }
  ],
  'Propietario': [
    {
      title: "Inicio",
      icon: HomeIcon,
      href: "/dashboard"
    },
    {
      title: "Mis Propiedades",
      icon: BuildingOffice2Icon,
      href: "/dashboard/mis-propiedades"
    },
    {
      title: "Directorio",
      icon: BuildingStorefrontIcon,
      href: "/dashboard/directorio"
    },
    {
      title: "Mis Documentos",
      icon: DocumentTextIcon,
      href: "/dashboard/mis-documentos"
    },
    {
      title: "Perfil",
      icon: UserCircle,
      href: "/dashboard/perfil"
    },
    {
      title: "Mesa de Ayuda",
      icon: ChatBubbleBottomCenterTextIcon,
      href: "/dashboard/mesa-de-ayuda"
    }
  ],
  'Arrendatario': [
    {
      title: "Inicio",
      icon: HomeIcon,
      href: "/dashboard"
    },
    {
      title: "Mi Alquiler",
      icon: BuildingOffice2Icon,
      href: "/dashboard/mi-alquiler"
    },
    {
      title: "Directorio",
      icon: BuildingStorefrontIcon,
      href: "/dashboard/directorio"
    },
    {
      title: "Mis Documentos",
      icon: DocumentTextIcon,
      href: "/dashboard/mis-documentos"
    },
    {
      title: "Perfil",
      icon: UserCircle,
      href: "/dashboard/perfil"
    },
    {
      title: "Mesa de Ayuda",
      icon: ChatBubbleBottomCenterTextIcon,
      href: "/dashboard/mesa-de-ayuda"
    }
  ]
} 