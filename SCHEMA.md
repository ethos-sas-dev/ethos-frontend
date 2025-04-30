-- Create ENUM types first

-- ticket enums
CREATE TYPE ticket_departamento AS ENUM ('cobranza', 'administracion', 'minutocorp');
CREATE TYPE ticket_estado AS ENUM ('abierto', 'en_progreso', 'resuelto', 'cerrado');
CREATE TYPE ticket_prioridad AS ENUM ('baja', 'media', 'alta');

-- factura enums
CREATE TYPE factura_estado AS ENUM ('Borrador', 'PendienteValidacion', 'Aprobada', 'Enviada', 'Pagada', 'Vencida', 'Anulada');

-- configuracion_facturacion enums
CREATE TYPE configuracion_frecuencia AS ENUM ('Mensual', 'Bimestral', 'Trimestral', 'Semestral', 'Anual');

-- perfil_cliente enums
CREATE TYPE perfil_cliente_tipo_persona AS ENUM ('Natural', 'Juridica');
CREATE TYPE perfil_cliente_rol AS ENUM ('Propietario', 'Arrendatario', 'Externo');

-- perfil_operacional enums
CREATE TYPE perfil_operacional_rol AS ENUM ('Jefe Operativo', 'Administrador', 'Directorio');

-- propiedad enums
CREATE TYPE propiedad_estado_entrega AS ENUM ('entregado', 'noEntregado');
CREATE TYPE propiedad_estado_uso AS ENUM ('enUso', 'disponible');
CREATE TYPE propiedad_estado_construccion AS ENUM ('enPlanos', 'terreno', 'enConstruccion', 'obraGris', 'acabados', 'finalizada', 'remodelacion', 'demolicion', 'abandonada', 'paralizada');
CREATE TYPE propiedad_actividad AS ENUM (
    'No definida', 'Comercio y distribucion', 'Venta al por mayor y menor',
    'Distribucion equipos electronicos', 'Almacenaje y dist. alimentos',
    'Distribucion ropa o textiles', 'Servicios de logistica', 'Almacenaje y gestion inventarios',
    'Servicios transporte y distribucion', 'E-commerce y envio productos',
    'Manufactura y ensamblaje', 'Ensamblaje productos electronicos',
    'Fabricacion productos pequenos', 'Imprentas y serigrafia',
    'Carpinteria o fabricacion muebles', 'Servicios de tecnologia',
    'Reparacion equipos electronicos', 'Desarrollo software o aplicaciones',
    'Soporte tecnico e informatica', 'Diseno grafico y multimedia',
    'Oficina administrativa', 'Consultoria (financiera, legal, RRHH)',
    'Agencias de marketing digital', 'Gestion de proyectos o eventos',
    'Servicios contables y auditoria', 'Alquiler de espacios',
    'Alquiler bodegas almacenamiento', 'Alquiler oficinas compartidas',
    'Servicios de impresion', 'Impresion gran formato',
    'Servicios fotocopiado y escaneo', 'Impresion material publicitario',
    'Comercio repuestos o autopartes', 'Venta piezas y repuestos vehiculos',
    'Venta equipos y herramientas esp.', 'Agencias de seguridad',
    'Venta y dist. sistemas seguridad', 'Instalacion equipos seguridad',
    'Artes y entretenimiento', 'Estudio foto o video',
    'Taller pintura o escultura', 'Produccion eventos o espectaculos',
    'Servicios reparacion y mantenimiento', 'Reparacion electrodomesticos',
    'Reparacion computadoras', 'Mantenimiento maquinaria vehiculos',
    'Servicios educativos', 'Centro formacion o capacitacion',
    'Clases computacion o diseno', 'Talleres y cursos especializados',
    'Cuidado personal', 'Centro estetica o peluqueria',
    'Gimnasio o centro entrenamiento', 'Restauracion y alimentos',
    'Produccion alimentos empaquetados', 'Fabricacion panaderia reposteria'
);

-- servicio enums
CREATE TYPE servicio_tipo AS ENUM ('CuotaRecurrente', 'ServicioAdicional', 'Ajuste', 'Otro');

-- pago enums
CREATE TYPE pago_metodo AS ENUM ('Transferencia', 'Cheque', 'Efectivo', 'TarjetaCredito', 'TarjetaDebito', 'Otro');
CREATE TYPE pago_estado AS ENUM ('PendienteVerificacion', 'Verificado', 'Rechazado', 'Conciliado');

-- Create tables

-- Archivos
CREATE TABLE archivos (
    id SERIAL PRIMARY KEY,
    external_storage_key TEXT UNIQUE NOT NULL,
    external_url TEXT,
    filename TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_archivos_external_key ON archivos(external_storage_key);

-- Perfil Operacional
CREATE TABLE perfiles_operacional (
    id SERIAL PRIMARY KEY,
    usuario_id UUID UNIQUE,
    telefono TEXT,
    extension TEXT,
    rol perfil_operacional_rol,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE SET NULL
);
CREATE INDEX idx_perfiles_operacional_usuario_id ON perfiles_operacional(usuario_id);

-- Empresa Representada
CREATE TABLE empresas_representada (
    id SERIAL PRIMARY KEY,
    direccion_legal TEXT,
    observaciones TEXT,
    nombre_comercial TEXT,
    cedula_representante_legal TEXT,
    cedula_representante_legal_pdf_id INT,
    ruc_empresa TEXT,
    ruc_empresa_pdf_id INT,
    autorizacion_representacion_pdf_id INT,
    nombre_representante_legal_rl TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    FOREIGN KEY (cedula_representante_legal_pdf_id) REFERENCES archivos(id) ON DELETE SET NULL,
    FOREIGN KEY (ruc_empresa_pdf_id) REFERENCES archivos(id) ON DELETE SET NULL,
    FOREIGN KEY (autorizacion_representacion_pdf_id) REFERENCES archivos(id) ON DELETE SET NULL
);

-- Persona Natural
CREATE TABLE personas_natural (
    id SERIAL PRIMARY KEY,
    aplica_ruc BOOLEAN DEFAULT FALSE,
    razon_social TEXT,
    ruc TEXT,
    cedula TEXT,
    ruc_pdf_id INT,
    cedula_pdf_id INT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    FOREIGN KEY (ruc_pdf_id) REFERENCES archivos(id) ON DELETE SET NULL,
    FOREIGN KEY (cedula_pdf_id) REFERENCES archivos(id) ON DELETE SET NULL
);
CREATE INDEX idx_personas_natural_cedula ON personas_natural(cedula);
CREATE INDEX idx_personas_natural_ruc ON personas_natural(ruc);

-- Persona Jurídica
CREATE TABLE personas_juridica (
    id SERIAL PRIMARY KEY,
    razon_social TEXT,
    nombre_comercial TEXT,
    cedula_representante_legal_pdf_id INT,
    nombramiento_representante_legal_pdf_id INT,
    razon_social_representante_legal TEXT,
    representante_legal_es_empresa BOOLEAN DEFAULT FALSE,
    cedula_representante_legal TEXT,
    ruc TEXT,
    ruc_pdf_id INT,
    empresa_representante_legal_id INT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    FOREIGN KEY (cedula_representante_legal_pdf_id) REFERENCES archivos(id) ON DELETE SET NULL,
    FOREIGN KEY (nombramiento_representante_legal_pdf_id) REFERENCES archivos(id) ON DELETE SET NULL,
    FOREIGN KEY (ruc_pdf_id) REFERENCES archivos(id) ON DELETE SET NULL,
    FOREIGN KEY (empresa_representante_legal_id) REFERENCES empresas_representada(id) ON DELETE SET NULL
);
CREATE INDEX idx_personas_juridica_ruc ON personas_juridica(ruc);
CREATE INDEX idx_personas_juridica_razon_social ON personas_juridica(razon_social);

-- Perfil Cliente (Actualizado)
CREATE TABLE perfiles_cliente (
    id SERIAL PRIMARY KEY,
    usuario_id UUID UNIQUE,
    tipo_persona perfil_cliente_tipo_persona NOT NULL,
    contacto_gerente JSONB,
    contacto_administrativo JSONB,
    contacto_proveedores JSONB,
    contacto_accesos JSONB,
    contratos_arrendamiento JSONB,
    rol perfil_cliente_rol,
    persona_natural_id INT UNIQUE, -- Relación a persona natural
    persona_juridica_id INT UNIQUE, -- Relación a persona juridica
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE SET NULL,
    FOREIGN KEY (persona_natural_id) REFERENCES personas_natural(id) ON DELETE SET NULL,
    FOREIGN KEY (persona_juridica_id) REFERENCES personas_juridica(id) ON DELETE SET NULL,
    CONSTRAINT chk_solo_un_tipo_persona CHECK (
       (persona_natural_id IS NOT NULL AND persona_juridica_id IS NULL) OR
       (persona_natural_id IS NULL AND persona_juridica_id IS NOT NULL) OR
       (persona_natural_id IS NULL AND persona_juridica_id IS NULL)
    )
);
CREATE INDEX idx_perfiles_cliente_usuario_id ON perfiles_cliente(usuario_id);
CREATE INDEX idx_perfiles_cliente_persona_natural_id ON perfiles_cliente(persona_natural_id) WHERE persona_natural_id IS NOT NULL;
CREATE INDEX idx_perfiles_cliente_persona_juridica_id ON perfiles_cliente(persona_juridica_id) WHERE persona_juridica_id IS NOT NULL;

-- Proyecto
CREATE TABLE proyectos (
    id SERIAL PRIMARY KEY,
    nombre TEXT UNIQUE NOT NULL,
    descripcion TEXT,
    ubicacion TEXT NOT NULL,
    foto_proyecto_id INT UNIQUE,
    tasa_base_fondo_inicial NUMERIC(10, 5) DEFAULT 5 CHECK (tasa_base_fondo_inicial >= 0),
    tasa_base_alicuota_ordinaria NUMERIC(10, 5) CHECK (tasa_base_alicuota_ordinaria >= 0),
    alicuotas_extraordinarias JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    FOREIGN KEY (foto_proyecto_id) REFERENCES archivos(id) ON DELETE SET NULL
);
CREATE INDEX idx_proyectos_foto_proyecto_id ON proyectos(foto_proyecto_id);

-- Propiedad
CREATE TABLE propiedades (
    id SERIAL PRIMARY KEY,
    proyecto_id INT,
    codigo_catastral TEXT,
    estado_entrega propiedad_estado_entrega NOT NULL,
    estado_uso propiedad_estado_uso NOT NULL,
    area_total NUMERIC(10, 2),
    historico_tasas JSONB,
    modo_incognito BOOLEAN DEFAULT TRUE,
    escritura_pdf_id INT UNIQUE,
    acta_entrega_pdf_id INT UNIQUE,
    contrato_arrendamiento_pdf_id INT UNIQUE,
    ocupante_externo BOOLEAN,
    propietario_id INT,
    ocupante_id INT UNIQUE,
    historico_ocupantes JSONB,
    identificadores JSONB,
    estado_de_construccion propiedad_estado_construccion,
    monto_fondo_inicial NUMERIC(12, 2),
    actividad propiedad_actividad,
    monto_alicuota_ordinaria NUMERIC(12, 2),
    areas_desglosadas JSONB,
    encargado_pago perfil_cliente_rol,
    imagen_id INT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    FOREIGN KEY (proyecto_id) REFERENCES proyectos(id) ON DELETE CASCADE,
    FOREIGN KEY (escritura_pdf_id) REFERENCES archivos(id) ON DELETE SET NULL,
    FOREIGN KEY (acta_entrega_pdf_id) REFERENCES archivos(id) ON DELETE SET NULL,
    FOREIGN KEY (contrato_arrendamiento_pdf_id) REFERENCES archivos(id) ON DELETE SET NULL,
    FOREIGN KEY (imagen_id) REFERENCES archivos(id) ON DELETE SET NULL,
    FOREIGN KEY (propietario_id) REFERENCES perfiles_cliente(id) ON DELETE SET NULL,
    FOREIGN KEY (ocupante_id) REFERENCES perfiles_cliente(id) ON DELETE SET NULL
);
CREATE INDEX idx_propiedades_proyecto_id ON propiedades(proyecto_id);
CREATE INDEX idx_propiedades_escritura_pdf_id ON propiedades(escritura_pdf_id);
CREATE INDEX idx_propiedades_acta_entrega_pdf_id ON propiedades(acta_entrega_pdf_id);
CREATE INDEX idx_propiedades_contrato_arrendamiento_pdf_id ON propiedades(contrato_arrendamiento_pdf_id);
CREATE INDEX idx_propiedades_imagen_id ON propiedades(imagen_id);
CREATE INDEX idx_propiedades_propietario_id ON propiedades(propietario_id);
CREATE INDEX idx_propiedades_ocupante_id ON propiedades(ocupante_id);

-- Servicio
CREATE TABLE servicios (
    id SERIAL PRIMARY KEY,
    codigo TEXT UNIQUE,
    nombre TEXT,
    descripcion TEXT,
    precio_base NUMERIC(12, 2),
    unidad TEXT,
    porcentaje_iva_defecto NUMERIC(3, 2) DEFAULT 0 CHECK (porcentaje_iva_defecto >= 0 AND porcentaje_iva_defecto <= 1),
    tipo servicio_tipo DEFAULT 'Otro',
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Configuracion Facturacion
CREATE TABLE configuraciones_facturacion (
    id SERIAL PRIMARY KEY,
    propiedad_id INT UNIQUE,
    cliente_id INT UNIQUE,
    frecuencia configuracion_frecuencia DEFAULT 'Mensual',
    bloquear_generacion_automatica BOOLEAN DEFAULT FALSE,
    descuento_pronto_pago_porcentaje NUMERIC(3, 2) DEFAULT 0 CHECK (descuento_pronto_pago_porcentaje >= 0 AND descuento_pronto_pago_porcentaje <= 1),
    condiciones_descuento TEXT,
    aplica_iva_general BOOLEAN DEFAULT FALSE,
    porcentaje_iva_general NUMERIC(3, 2) DEFAULT 0.15 CHECK (porcentaje_iva_general >= 0 AND porcentaje_iva_general <= 1),
    notas_configuracion TEXT,
    activo BOOLEAN DEFAULT TRUE,
    precios_especiales_por_servicio JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    FOREIGN KEY (propiedad_id) REFERENCES propiedades(id) ON DELETE CASCADE,
    FOREIGN KEY (cliente_id) REFERENCES perfiles_cliente(id) ON DELETE CASCADE
);
CREATE INDEX idx_configuraciones_facturacion_propiedad_id ON configuraciones_facturacion(propiedad_id);
CREATE INDEX idx_configuraciones_facturacion_cliente_id ON configuraciones_facturacion(cliente_id);

-- Factura
CREATE TABLE facturas (
    id SERIAL PRIMARY KEY,
    periodo TEXT UNIQUE,
    estado factura_estado DEFAULT 'Borrador',
    propiedad_id INT,
    cliente_id INT,
    fecha_generacion TIMESTAMPTZ,
    fecha_aprobacion TIMESTAMPTZ,
    fecha_envio TIMESTAMPTZ,
    fecha_vencimiento TIMESTAMPTZ,
    subtotal NUMERIC(12, 2) DEFAULT 0,
    monto_iva NUMERIC(12, 2) DEFAULT 0,
    total NUMERIC(12, 2),
    observaciones TEXT,
    contifico_id TEXT,
    items_factura JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    FOREIGN KEY (propiedad_id) REFERENCES propiedades(id) ON DELETE SET NULL,
    FOREIGN KEY (cliente_id) REFERENCES perfiles_cliente(id) ON DELETE SET NULL
);
CREATE INDEX idx_facturas_propiedad_id ON facturas(propiedad_id);
CREATE INDEX idx_facturas_cliente_id ON facturas(cliente_id);
CREATE INDEX idx_facturas_estado ON facturas(estado);
CREATE INDEX idx_facturas_periodo ON facturas(periodo);

-- Pago
CREATE TABLE pagos (
    id SERIAL PRIMARY KEY,
    factura_id INT,
    cliente_id INT,
    fecha_pago TIMESTAMPTZ,
    monto NUMERIC(12, 2) CHECK (monto >= 0),
    metodo pago_metodo,
    referencia TEXT,
    comprobante_archivo_id INT UNIQUE,
    estado pago_estado DEFAULT 'PendienteVerificacion',
    fecha_verificacion TIMESTAMPTZ,
    verificado_por_id INT,
    notas_administrador TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    FOREIGN KEY (factura_id) REFERENCES facturas(id) ON DELETE SET NULL,
    FOREIGN KEY (cliente_id) REFERENCES perfiles_cliente(id) ON DELETE SET NULL,
    FOREIGN KEY (verificado_por_id) REFERENCES perfiles_operacional(id) ON DELETE SET NULL,
    FOREIGN KEY (comprobante_archivo_id) REFERENCES archivos(id) ON DELETE SET NULL
);
CREATE INDEX idx_pagos_factura_id ON pagos(factura_id);
CREATE INDEX idx_pagos_cliente_id ON pagos(cliente_id);
CREATE INDEX idx_pagos_verificado_por_id ON pagos(verificado_por_id);
CREATE INDEX idx_pagos_comprobante_archivo_id ON pagos(comprobante_archivo_id);
CREATE INDEX idx_pagos_estado ON pagos(estado);

-- Ticket
CREATE TABLE tickets (
    id SERIAL PRIMARY KEY,
    titulo TEXT,
    departamento ticket_departamento,
    estado ticket_estado,
    prioridad ticket_prioridad,
    perfil_cliente_id INT,
    propiedad_id INT UNIQUE,
    numero_contacto_ticket TEXT,
    asignado_a TEXT,
    descripcion TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    FOREIGN KEY (perfil_cliente_id) REFERENCES perfiles_cliente(id) ON DELETE SET NULL,
    FOREIGN KEY (propiedad_id) REFERENCES propiedades(id) ON DELETE SET NULL
);
CREATE INDEX idx_tickets_perfil_cliente_id ON tickets(perfil_cliente_id);
CREATE INDEX idx_tickets_propiedad_id ON tickets(propiedad_id);
CREATE INDEX idx_tickets_estado ON tickets(estado);
CREATE INDEX idx_tickets_prioridad ON tickets(prioridad);
CREATE INDEX idx_tickets_departamento ON tickets(departamento);

-- Junction table for proyecto <-> perfil_operacional (many-to-many)
CREATE TABLE proyecto_perfil_operacional_links (
    id SERIAL PRIMARY KEY,
    proyecto_id INT NOT NULL,
    perfil_operacional_id INT NOT NULL,
    FOREIGN KEY (proyecto_id) REFERENCES proyectos(id) ON DELETE CASCADE,
    FOREIGN KEY (perfil_operacional_id) REFERENCES perfiles_operacional(id) ON DELETE CASCADE,
    UNIQUE (proyecto_id, perfil_operacional_id)
);
CREATE INDEX idx_proyecto_perfil_operacional_links_proyecto ON proyecto_perfil_operacional_links(proyecto_id);
CREATE INDEX idx_proyecto_perfil_operacional_links_perfil ON proyecto_perfil_operacional_links(perfil_operacional_id);

-- Junction table for ticket <-> archivo (many-to-many)
CREATE TABLE ticket_archivo_links (
    id SERIAL PRIMARY KEY,
    ticket_id INT NOT NULL,
    archivo_id INT NOT NULL,
    FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
    FOREIGN KEY (archivo_id) REFERENCES archivos(id) ON DELETE CASCADE,
    UNIQUE (ticket_id, archivo_id)
);
CREATE INDEX idx_ticket_archivo_links_ticket ON ticket_archivo_links(ticket_id);
CREATE INDEX idx_ticket_archivo_links_archivo ON ticket_archivo_links(archivo_id);