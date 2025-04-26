export const propiedad_actividad: string[] = [
    'No definida',
    'Comercio y distribucion',
    'Venta al por mayor y menor',
    'Distribucion equipos electronicos',
    'Almacenaje y dist. alimentos',
    'Distribucion ropa o textiles',
    'Servicios de logistica',
    'Almacenaje y gestion inventarios',
    'Servicios transporte y distribucion',
    'E-commerce y envio productos',
    'Manufactura y ensamblaje',
    'Ensamblaje productos electronicos',
    'Fabricacion productos pequenos',
    'Imprentas y serigrafia',
    'Carpinteria o fabricacion muebles',
    'Servicios de tecnologia',
    'Reparacion equipos electronicos',
    'Desarrollo software o aplicaciones',
    'Soporte tecnico e informatica',
    'Diseno grafico y multimedia',
    'Oficina administrativa',
    'Consultoria (financiera, legal, RRHH)',
    'Agencias de marketing digital',
    'Gestion de proyectos o eventos',
    'Servicios contables y auditoria',
    'Alquiler de espacios',
    'Alquiler bodegas almacenamiento',
    'Alquiler oficinas compartidas',
    'Servicios de impresion',
    'Impresion gran formato',
    'Servicios fotocopiado y escaneo',
    'Impresion material publicitario',
    'Comercio repuestos o autopartes',
    'Venta piezas y repuestos vehiculos',
    'Venta equipos y herramientas esp.',
    'Agencias de seguridad',
    'Venta y dist. sistemas seguridad',
    'Instalacion equipos seguridad',
    'Artes y entretenimiento',
    'Estudio foto o video',
    'Taller pintura o escultura',
    'Produccion eventos o espectaculos',
    'Servicios reparacion y mantenimiento',
    'Reparacion electrodomesticos',
    'Reparacion computadoras',
    'Mantenimiento maquinaria vehiculos',
    'Servicios educativos',
    'Centro formacion o capacitacion',
    'Clases computacion o diseno',
    'Talleres y cursos especializados',
    'Cuidado personal',
    'Centro estetica o peluqueria',
    'Gimnasio o centro entrenamiento',
    'Restauracion y alimentos',
    'Produccion alimentos empaquetados',
    'Fabricacion panaderia reposteria'
];

export const propiedad_estado_construccion: string[] = [
    'enPlanos',
    'terreno',
    'enConstruccion',
    'obraGris',
    'acabados',
    'finalizada',
    'remodelacion',
    'demolicion',
    'abandonada',
    'paralizada'
];

// Nuevas constantes
export const IDENTIFICADORES_SUPERIOR = [
  { value: "Manzana", label: "Manzana" },
  { value: "Bloque", label: "Bloque" },
  { value: "Lote", label: "Lote" },
  { value: "Edificio", label: "Edificio" },
] as const;

export const IDENTIFICADORES_INTERMEDIO = [
  { value: 'Etapa', label: 'Etapa' },
  // Añade otras opciones si las necesitas
] as const;

export const IDENTIFICADORES_INFERIOR = [
  { value: "Bodega", label: "Bodega" },
  { value: "Ofibodega", label: "Ofibodega" },
  { value: "Local", label: "Local" },
  { value: "Oficina", label: "Oficina" },
  { value: "Macrolote", label: "Macrolote" },
  { value: "Departamento", label: "Departamento" },
  { value: "Solar", label: "Solar" },
] as const;

export const ESTADOS_ENTREGA = [
    { value: 'noEntregado', label: 'No Entregado' },
    { value: 'entregado', label: 'Entregado' },
] as const;

export const ENCARGADOS_PAGO = [
  { value: "Propietario", label: "Propietario" },
  { value: "Arrendatario", label: "Arrendatario" },
] as const;

export const TIPOS_AREA = [
  { value: "util", label: "Útil" },
  { value: "parqueo", label: "Parqueo" },
  { value: "patio", label: "Patio" },
  { value: "plantaBaja", label: "Planta Baja" },
  { value: "pisoUno", label: "Piso Uno" },
  { value: "pisoDos", label: "Piso Dos" },
  { value: "maniobra", label: "Maniobra" },
  { value: "terreno", label: "Terreno" },
  { value: "mezzanine", label: "Mezzanine" },
  { value: "pasillo", label: "Pasillo" },
  { value: "adicional", label: "Adicional" },
] as const; 