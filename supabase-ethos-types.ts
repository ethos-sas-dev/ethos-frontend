export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      archivos: {
        Row: {
          created_at: string | null
          external_storage_key: string
          external_url: string | null
          filename: string | null
          id: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          external_storage_key: string
          external_url?: string | null
          filename?: string | null
          id?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          external_storage_key?: string
          external_url?: string | null
          filename?: string | null
          id?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      auth_otps: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: number
          identifier: string
          otp_code: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          expires_at: string
          id?: number
          identifier: string
          otp_code: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: number
          identifier?: string
          otp_code?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      categoria_tickets: {
        Row: {
          activo: boolean | null
          categoria: string
          created_at: string | null
          descripcion: string | null
          dias_vencimiento: number
          id: number
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          categoria: string
          created_at?: string | null
          descripcion?: string | null
          dias_vencimiento: number
          id?: number
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          categoria?: string
          created_at?: string | null
          descripcion?: string | null
          dias_vencimiento?: number
          id?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      configuraciones_facturacion: {
        Row: {
          activo: boolean | null
          aplica_iva_general: boolean | null
          bloquear_generacion_automatica: boolean | null
          cliente_id: number | null
          created_at: string | null
          descuento_pronto_pago_porcentaje: number | null
          frecuencia:
            | Database["public"]["Enums"]["configuracion_frecuencia"]
            | null
          id: number
          notas_configuracion: string | null
          porcentaje_iva_general: number | null
          propiedad_id: number | null
          servicio_id: number | null
          tasa_base_especial: number | null
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          aplica_iva_general?: boolean | null
          bloquear_generacion_automatica?: boolean | null
          cliente_id?: number | null
          created_at?: string | null
          descuento_pronto_pago_porcentaje?: number | null
          frecuencia?:
            | Database["public"]["Enums"]["configuracion_frecuencia"]
            | null
          id?: number
          notas_configuracion?: string | null
          porcentaje_iva_general?: number | null
          propiedad_id?: number | null
          servicio_id?: number | null
          tasa_base_especial?: number | null
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          aplica_iva_general?: boolean | null
          bloquear_generacion_automatica?: boolean | null
          cliente_id?: number | null
          created_at?: string | null
          descuento_pronto_pago_porcentaje?: number | null
          frecuencia?:
            | Database["public"]["Enums"]["configuracion_frecuencia"]
            | null
          id?: number
          notas_configuracion?: string | null
          porcentaje_iva_general?: number | null
          propiedad_id?: number | null
          servicio_id?: number | null
          tasa_base_especial?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "configuraciones_facturacion_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "perfiles_cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "configuraciones_facturacion_propiedad_id_fkey"
            columns: ["propiedad_id"]
            isOneToOne: true
            referencedRelation: "propiedades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "configuraciones_facturacion_servicio_id_fkey"
            columns: ["servicio_id"]
            isOneToOne: false
            referencedRelation: "servicios"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas_representada: {
        Row: {
          autorizacion_representacion_pdf_id: number | null
          cedula_representante_legal: string | null
          cedula_representante_legal_pdf_id: number | null
          created_at: string | null
          direccion_legal: string | null
          id: number
          nombre_comercial: string | null
          nombre_representante_legal_rl: string | null
          observaciones: string | null
          ruc_empresa: string | null
          ruc_empresa_pdf_id: number | null
          updated_at: string | null
        }
        Insert: {
          autorizacion_representacion_pdf_id?: number | null
          cedula_representante_legal?: string | null
          cedula_representante_legal_pdf_id?: number | null
          created_at?: string | null
          direccion_legal?: string | null
          id?: number
          nombre_comercial?: string | null
          nombre_representante_legal_rl?: string | null
          observaciones?: string | null
          ruc_empresa?: string | null
          ruc_empresa_pdf_id?: number | null
          updated_at?: string | null
        }
        Update: {
          autorizacion_representacion_pdf_id?: number | null
          cedula_representante_legal?: string | null
          cedula_representante_legal_pdf_id?: number | null
          created_at?: string | null
          direccion_legal?: string | null
          id?: number
          nombre_comercial?: string | null
          nombre_representante_legal_rl?: string | null
          observaciones?: string | null
          ruc_empresa?: string | null
          ruc_empresa_pdf_id?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "empresas_representada_autorizacion_representacion_pdf_id_fkey"
            columns: ["autorizacion_representacion_pdf_id"]
            isOneToOne: false
            referencedRelation: "archivos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empresas_representada_cedula_representante_legal_pdf_id_fkey"
            columns: ["cedula_representante_legal_pdf_id"]
            isOneToOne: false
            referencedRelation: "archivos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empresas_representada_ruc_empresa_pdf_id_fkey"
            columns: ["ruc_empresa_pdf_id"]
            isOneToOne: false
            referencedRelation: "archivos"
            referencedColumns: ["id"]
          },
        ]
      }
      facturas: {
        Row: {
          cliente_id: number | null
          comentarios_pago: string | null
          comprobante_pago_id: number | null
          contifico_id: string | null
          created_at: string | null
          desde_el_sistema: boolean | null
          estado: Database["public"]["Enums"]["factura_estado"] | null
          fecha_aprobacion: string | null
          fecha_comprobante: string | null
          fecha_envio: string | null
          fecha_generacion: string | null
          fecha_vencimiento: string | null
          id: number
          items_factura: Json | null
          monto_iva: number | null
          observaciones: string | null
          periodo: string | null
          propiedad_id: number | null
          retencion: number | null
          subtotal: number | null
          total: number | null
          updated_at: string | null
        }
        Insert: {
          cliente_id?: number | null
          comentarios_pago?: string | null
          comprobante_pago_id?: number | null
          contifico_id?: string | null
          created_at?: string | null
          desde_el_sistema?: boolean | null
          estado?: Database["public"]["Enums"]["factura_estado"] | null
          fecha_aprobacion?: string | null
          fecha_comprobante?: string | null
          fecha_envio?: string | null
          fecha_generacion?: string | null
          fecha_vencimiento?: string | null
          id?: number
          items_factura?: Json | null
          monto_iva?: number | null
          observaciones?: string | null
          periodo?: string | null
          propiedad_id?: number | null
          retencion?: number | null
          subtotal?: number | null
          total?: number | null
          updated_at?: string | null
        }
        Update: {
          cliente_id?: number | null
          comentarios_pago?: string | null
          comprobante_pago_id?: number | null
          contifico_id?: string | null
          created_at?: string | null
          desde_el_sistema?: boolean | null
          estado?: Database["public"]["Enums"]["factura_estado"] | null
          fecha_aprobacion?: string | null
          fecha_comprobante?: string | null
          fecha_envio?: string | null
          fecha_generacion?: string | null
          fecha_vencimiento?: string | null
          id?: number
          items_factura?: Json | null
          monto_iva?: number | null
          observaciones?: string | null
          periodo?: string | null
          propiedad_id?: number | null
          retencion?: number | null
          subtotal?: number | null
          total?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "facturas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "perfiles_cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facturas_comprobante_pago_id_fkey"
            columns: ["comprobante_pago_id"]
            isOneToOne: false
            referencedRelation: "archivos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facturas_propiedad_id_fkey"
            columns: ["propiedad_id"]
            isOneToOne: false
            referencedRelation: "propiedades"
            referencedColumns: ["id"]
          },
        ]
      }
      pagos: {
        Row: {
          cliente_id: number | null
          comprobante_archivo_id: number | null
          created_at: string | null
          estado: Database["public"]["Enums"]["pago_estado"] | null
          factura_id: number | null
          fecha_pago: string | null
          fecha_verificacion: string | null
          id: number
          metodo: Database["public"]["Enums"]["pago_metodo"] | null
          monto: number | null
          notas_administrador: string | null
          referencia: string | null
          updated_at: string | null
          verificado_por_id: number | null
        }
        Insert: {
          cliente_id?: number | null
          comprobante_archivo_id?: number | null
          created_at?: string | null
          estado?: Database["public"]["Enums"]["pago_estado"] | null
          factura_id?: number | null
          fecha_pago?: string | null
          fecha_verificacion?: string | null
          id?: number
          metodo?: Database["public"]["Enums"]["pago_metodo"] | null
          monto?: number | null
          notas_administrador?: string | null
          referencia?: string | null
          updated_at?: string | null
          verificado_por_id?: number | null
        }
        Update: {
          cliente_id?: number | null
          comprobante_archivo_id?: number | null
          created_at?: string | null
          estado?: Database["public"]["Enums"]["pago_estado"] | null
          factura_id?: number | null
          fecha_pago?: string | null
          fecha_verificacion?: string | null
          id?: number
          metodo?: Database["public"]["Enums"]["pago_metodo"] | null
          monto?: number | null
          notas_administrador?: string | null
          referencia?: string | null
          updated_at?: string | null
          verificado_por_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pagos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "perfiles_cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_comprobante_archivo_id_fkey"
            columns: ["comprobante_archivo_id"]
            isOneToOne: true
            referencedRelation: "archivos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_factura_id_fkey"
            columns: ["factura_id"]
            isOneToOne: false
            referencedRelation: "facturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_verificado_por_id_fkey"
            columns: ["verificado_por_id"]
            isOneToOne: false
            referencedRelation: "perfiles_operacional"
            referencedColumns: ["id"]
          },
        ]
      }
      pagos_cliente: {
        Row: {
          cliente_id: number | null
          contifico_cheque_estado: string | null
          contifico_cobro_id: string | null
          created_at: string | null
          estado: string | null
          factura_id: number | null
          fecha_pago: string
          id: number
          medio_pago: string
          monto: number
          numero_cheque: string | null
          observaciones: string | null
        }
        Insert: {
          cliente_id?: number | null
          contifico_cheque_estado?: string | null
          contifico_cobro_id?: string | null
          created_at?: string | null
          estado?: string | null
          factura_id?: number | null
          fecha_pago?: string
          id?: number
          medio_pago: string
          monto: number
          numero_cheque?: string | null
          observaciones?: string | null
        }
        Update: {
          cliente_id?: number | null
          contifico_cheque_estado?: string | null
          contifico_cobro_id?: string | null
          created_at?: string | null
          estado?: string | null
          factura_id?: number | null
          fecha_pago?: string
          id?: number
          medio_pago?: string
          monto?: number
          numero_cheque?: string | null
          observaciones?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pagos_cliente_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "perfiles_cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_cliente_factura_id_fkey"
            columns: ["factura_id"]
            isOneToOne: false
            referencedRelation: "facturas"
            referencedColumns: ["id"]
          },
        ]
      }
      perfiles_cliente: {
        Row: {
          contacto_accesos: Json | null
          contacto_administrativo: Json | null
          contacto_gerente: Json | null
          contacto_proveedores: Json | null
          contratos_arrendamiento: Json | null
          created_at: string | null
          id: number
          persona_juridica_id: number | null
          persona_natural_id: number | null
          rol: Database["public"]["Enums"]["perfil_cliente_rol"] | null
          tipo_persona: Database["public"]["Enums"]["perfil_cliente_tipo_persona"]
          updated_at: string | null
          usuario_id: string | null
        }
        Insert: {
          contacto_accesos?: Json | null
          contacto_administrativo?: Json | null
          contacto_gerente?: Json | null
          contacto_proveedores?: Json | null
          contratos_arrendamiento?: Json | null
          created_at?: string | null
          id?: number
          persona_juridica_id?: number | null
          persona_natural_id?: number | null
          rol?: Database["public"]["Enums"]["perfil_cliente_rol"] | null
          tipo_persona: Database["public"]["Enums"]["perfil_cliente_tipo_persona"]
          updated_at?: string | null
          usuario_id?: string | null
        }
        Update: {
          contacto_accesos?: Json | null
          contacto_administrativo?: Json | null
          contacto_gerente?: Json | null
          contacto_proveedores?: Json | null
          contratos_arrendamiento?: Json | null
          created_at?: string | null
          id?: number
          persona_juridica_id?: number | null
          persona_natural_id?: number | null
          rol?: Database["public"]["Enums"]["perfil_cliente_rol"] | null
          tipo_persona?: Database["public"]["Enums"]["perfil_cliente_tipo_persona"]
          updated_at?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_perfil_persona_juridica"
            columns: ["persona_juridica_id"]
            isOneToOne: false
            referencedRelation: "personas_juridica"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_perfil_persona_natural"
            columns: ["persona_natural_id"]
            isOneToOne: false
            referencedRelation: "personas_natural"
            referencedColumns: ["id"]
          },
        ]
      }
      perfiles_operacional: {
        Row: {
          created_at: string | null
          extension: string | null
          id: number
          rol: Database["public"]["Enums"]["perfil_operacional_rol"] | null
          telefono: string | null
          updated_at: string | null
          usuario_id: string | null
        }
        Insert: {
          created_at?: string | null
          extension?: string | null
          id?: number
          rol?: Database["public"]["Enums"]["perfil_operacional_rol"] | null
          telefono?: string | null
          updated_at?: string | null
          usuario_id?: string | null
        }
        Update: {
          created_at?: string | null
          extension?: string | null
          id?: number
          rol?: Database["public"]["Enums"]["perfil_operacional_rol"] | null
          telefono?: string | null
          updated_at?: string | null
          usuario_id?: string | null
        }
        Relationships: []
      }
      personas_juridica: {
        Row: {
          cedula_representante_legal: string | null
          cedula_representante_legal_pdf_id: number | null
          created_at: string | null
          empresa_representante_legal_id: number | null
          id: number
          nombramiento_representante_legal_pdf_id: number | null
          nombre_comercial: string | null
          razon_social: string | null
          razon_social_representante_legal: string | null
          representante_legal_es_empresa: boolean | null
          ruc: string | null
          ruc_pdf_id: number | null
          updated_at: string | null
        }
        Insert: {
          cedula_representante_legal?: string | null
          cedula_representante_legal_pdf_id?: number | null
          created_at?: string | null
          empresa_representante_legal_id?: number | null
          id?: number
          nombramiento_representante_legal_pdf_id?: number | null
          nombre_comercial?: string | null
          razon_social?: string | null
          razon_social_representante_legal?: string | null
          representante_legal_es_empresa?: boolean | null
          ruc?: string | null
          ruc_pdf_id?: number | null
          updated_at?: string | null
        }
        Update: {
          cedula_representante_legal?: string | null
          cedula_representante_legal_pdf_id?: number | null
          created_at?: string | null
          empresa_representante_legal_id?: number | null
          id?: number
          nombramiento_representante_legal_pdf_id?: number | null
          nombre_comercial?: string | null
          razon_social?: string | null
          razon_social_representante_legal?: string | null
          representante_legal_es_empresa?: boolean | null
          ruc?: string | null
          ruc_pdf_id?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "personas_juridica_cedula_representante_legal_pdf_id_fkey"
            columns: ["cedula_representante_legal_pdf_id"]
            isOneToOne: false
            referencedRelation: "archivos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personas_juridica_empresa_representante_legal_id_fkey"
            columns: ["empresa_representante_legal_id"]
            isOneToOne: false
            referencedRelation: "empresas_representada"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personas_juridica_nombramiento_representante_legal_pdf_id_fkey"
            columns: ["nombramiento_representante_legal_pdf_id"]
            isOneToOne: false
            referencedRelation: "archivos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personas_juridica_ruc_pdf_id_fkey"
            columns: ["ruc_pdf_id"]
            isOneToOne: false
            referencedRelation: "archivos"
            referencedColumns: ["id"]
          },
        ]
      }
      personas_natural: {
        Row: {
          aplica_ruc: boolean | null
          cedula: string | null
          cedula_pdf_id: number | null
          created_at: string | null
          id: number
          razon_social: string | null
          ruc: string | null
          ruc_pdf_id: number | null
          updated_at: string | null
        }
        Insert: {
          aplica_ruc?: boolean | null
          cedula?: string | null
          cedula_pdf_id?: number | null
          created_at?: string | null
          id?: number
          razon_social?: string | null
          ruc?: string | null
          ruc_pdf_id?: number | null
          updated_at?: string | null
        }
        Update: {
          aplica_ruc?: boolean | null
          cedula?: string | null
          cedula_pdf_id?: number | null
          created_at?: string | null
          id?: number
          razon_social?: string | null
          ruc?: string | null
          ruc_pdf_id?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "personas_natural_cedula_pdf_id_fkey"
            columns: ["cedula_pdf_id"]
            isOneToOne: false
            referencedRelation: "archivos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personas_natural_ruc_pdf_id_fkey"
            columns: ["ruc_pdf_id"]
            isOneToOne: false
            referencedRelation: "archivos"
            referencedColumns: ["id"]
          },
        ]
      }
      propiedades: {
        Row: {
          acta_entrega_pdf_id: number | null
          actividad: Database["public"]["Enums"]["propiedad_actividad"] | null
          area_total: number | null
          areas_desglosadas: Json | null
          codigo_catastral: string | null
          contrato_arrendamiento_pdf_id: number | null
          created_at: string | null
          encargado_pago:
            | Database["public"]["Enums"]["perfil_cliente_rol"]
            | null
          escritura_pdf_id: number | null
          estado_de_construccion:
            | Database["public"]["Enums"]["propiedad_estado_construccion"]
            | null
          estado_entrega: Database["public"]["Enums"]["propiedad_estado_entrega"]
          estado_uso: Database["public"]["Enums"]["propiedad_estado_uso"]
          historico_ocupantes: Json | null
          historico_tasas: Json | null
          id: number
          identificadores: Json | null
          imagen: string | null
          modo_incognito: boolean | null
          monto_alicuota_ordinaria: number | null
          monto_fondo_inicial: number | null
          ocupante_externo: boolean | null
          ocupante_id: number | null
          pagos: Json | null
          propietario_id: number | null
          proyecto_id: number | null
          updated_at: string | null
        }
        Insert: {
          acta_entrega_pdf_id?: number | null
          actividad?: Database["public"]["Enums"]["propiedad_actividad"] | null
          area_total?: number | null
          areas_desglosadas?: Json | null
          codigo_catastral?: string | null
          contrato_arrendamiento_pdf_id?: number | null
          created_at?: string | null
          encargado_pago?:
            | Database["public"]["Enums"]["perfil_cliente_rol"]
            | null
          escritura_pdf_id?: number | null
          estado_de_construccion?:
            | Database["public"]["Enums"]["propiedad_estado_construccion"]
            | null
          estado_entrega: Database["public"]["Enums"]["propiedad_estado_entrega"]
          estado_uso: Database["public"]["Enums"]["propiedad_estado_uso"]
          historico_ocupantes?: Json | null
          historico_tasas?: Json | null
          id?: number
          identificadores?: Json | null
          imagen?: string | null
          modo_incognito?: boolean | null
          monto_alicuota_ordinaria?: number | null
          monto_fondo_inicial?: number | null
          ocupante_externo?: boolean | null
          ocupante_id?: number | null
          pagos?: Json | null
          propietario_id?: number | null
          proyecto_id?: number | null
          updated_at?: string | null
        }
        Update: {
          acta_entrega_pdf_id?: number | null
          actividad?: Database["public"]["Enums"]["propiedad_actividad"] | null
          area_total?: number | null
          areas_desglosadas?: Json | null
          codigo_catastral?: string | null
          contrato_arrendamiento_pdf_id?: number | null
          created_at?: string | null
          encargado_pago?:
            | Database["public"]["Enums"]["perfil_cliente_rol"]
            | null
          escritura_pdf_id?: number | null
          estado_de_construccion?:
            | Database["public"]["Enums"]["propiedad_estado_construccion"]
            | null
          estado_entrega?: Database["public"]["Enums"]["propiedad_estado_entrega"]
          estado_uso?: Database["public"]["Enums"]["propiedad_estado_uso"]
          historico_ocupantes?: Json | null
          historico_tasas?: Json | null
          id?: number
          identificadores?: Json | null
          imagen?: string | null
          modo_incognito?: boolean | null
          monto_alicuota_ordinaria?: number | null
          monto_fondo_inicial?: number | null
          ocupante_externo?: boolean | null
          ocupante_id?: number | null
          pagos?: Json | null
          propietario_id?: number | null
          proyecto_id?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "propiedades_acta_entrega_pdf_id_fkey"
            columns: ["acta_entrega_pdf_id"]
            isOneToOne: false
            referencedRelation: "archivos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propiedades_contrato_arrendamiento_pdf_id_fkey"
            columns: ["contrato_arrendamiento_pdf_id"]
            isOneToOne: false
            referencedRelation: "archivos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propiedades_escritura_pdf_id_fkey"
            columns: ["escritura_pdf_id"]
            isOneToOne: false
            referencedRelation: "archivos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propiedades_ocupante_id_fkey"
            columns: ["ocupante_id"]
            isOneToOne: false
            referencedRelation: "perfiles_cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propiedades_propietario_id_fkey"
            columns: ["propietario_id"]
            isOneToOne: false
            referencedRelation: "perfiles_cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propiedades_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
        ]
      }
      proyecto_perfil_operacional_links: {
        Row: {
          id: number
          perfil_operacional_id: number
          proyecto_id: number
        }
        Insert: {
          id?: number
          perfil_operacional_id: number
          proyecto_id: number
        }
        Update: {
          id?: number
          perfil_operacional_id?: number
          proyecto_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "proyecto_perfil_operacional_links_perfil_operacional_id_fkey"
            columns: ["perfil_operacional_id"]
            isOneToOne: false
            referencedRelation: "perfiles_operacional"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyecto_perfil_operacional_links_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
        ]
      }
      proyectos: {
        Row: {
          alicuotas_extraordinarias: Json | null
          api_contifico: string | null
          created_at: string | null
          descripcion: string | null
          foto_proyecto_id: number | null
          id: number
          nombre: string
          tasa_base_alicuota_ordinaria: number | null
          tasa_base_fondo_inicial: number | null
          ubicacion: string
          updated_at: string | null
        }
        Insert: {
          alicuotas_extraordinarias?: Json | null
          api_contifico?: string | null
          created_at?: string | null
          descripcion?: string | null
          foto_proyecto_id?: number | null
          id?: number
          nombre: string
          tasa_base_alicuota_ordinaria?: number | null
          tasa_base_fondo_inicial?: number | null
          ubicacion: string
          updated_at?: string | null
        }
        Update: {
          alicuotas_extraordinarias?: Json | null
          api_contifico?: string | null
          created_at?: string | null
          descripcion?: string | null
          foto_proyecto_id?: number | null
          id?: number
          nombre?: string
          tasa_base_alicuota_ordinaria?: number | null
          tasa_base_fondo_inicial?: number | null
          ubicacion?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proyectos_foto_proyecto_id_fkey"
            columns: ["foto_proyecto_id"]
            isOneToOne: true
            referencedRelation: "archivos"
            referencedColumns: ["id"]
          },
        ]
      }
      servicios: {
        Row: {
          activo: boolean | null
          codigo: string | null
          created_at: string | null
          descripcion: string | null
          id: number
          id_contifico: string | null
          nombre: string | null
          porcentaje_iva_defecto: number | null
          precio_base: number | null
          tipo: Database["public"]["Enums"]["servicio_tipo"] | null
          unidad: string | null
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          codigo?: string | null
          created_at?: string | null
          descripcion?: string | null
          id?: number
          id_contifico?: string | null
          nombre?: string | null
          porcentaje_iva_defecto?: number | null
          precio_base?: number | null
          tipo?: Database["public"]["Enums"]["servicio_tipo"] | null
          unidad?: string | null
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          codigo?: string | null
          created_at?: string | null
          descripcion?: string | null
          id?: number
          id_contifico?: string | null
          nombre?: string | null
          porcentaje_iva_defecto?: number | null
          precio_base?: number | null
          tipo?: Database["public"]["Enums"]["servicio_tipo"] | null
          unidad?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ticket_archivo_links: {
        Row: {
          archivo_id: number
          id: number
          ticket_id: number
        }
        Insert: {
          archivo_id: number
          id?: number
          ticket_id: number
        }
        Update: {
          archivo_id?: number
          id?: number
          ticket_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "ticket_archivo_links_archivo_id_fkey"
            columns: ["archivo_id"]
            isOneToOne: false
            referencedRelation: "archivos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_archivo_links_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          acciones_correctivas: Json | null
          categoria: number | null
          created_at: string | null
          descripcion: string | null
          estado: Database["public"]["Enums"]["ticket_estado"] | null
          id: number
          media_links: Json | null
          numero_contacto_ticket: string | null
          perfil_cliente_id: number | null
          propiedad_id: number | null
          titulo: string | null
          updated_at: string | null
        }
        Insert: {
          acciones_correctivas?: Json | null
          categoria?: number | null
          created_at?: string | null
          descripcion?: string | null
          estado?: Database["public"]["Enums"]["ticket_estado"] | null
          id?: number
          media_links?: Json | null
          numero_contacto_ticket?: string | null
          perfil_cliente_id?: number | null
          propiedad_id?: number | null
          titulo?: string | null
          updated_at?: string | null
        }
        Update: {
          acciones_correctivas?: Json | null
          categoria?: number | null
          created_at?: string | null
          descripcion?: string | null
          estado?: Database["public"]["Enums"]["ticket_estado"] | null
          id?: number
          media_links?: Json | null
          numero_contacto_ticket?: string | null
          perfil_cliente_id?: number | null
          propiedad_id?: number | null
          titulo?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_tickets_categoria"
            columns: ["categoria"]
            isOneToOne: false
            referencedRelation: "categoria_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_perfil_cliente_id_fkey"
            columns: ["perfil_cliente_id"]
            isOneToOne: false
            referencedRelation: "perfiles_cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_propiedad_id_fkey"
            columns: ["propiedad_id"]
            isOneToOne: false
            referencedRelation: "propiedades"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      buscar_propiedades_proyecto: {
        Args: {
          p_id: number
          search_pattern: string
          page_limit: number
          page_offset: number
        }
        Returns: {
          id: number
          identificadores: Json
          actividad: string
          estado_uso: string
          monto_alicuota_ordinaria: number
          area_total: number
          imagen: string
          proyecto_id: number
          propietario_id: number
          ocupante_id: number
          ocupante_externo: boolean
          propietario: Json
          ocupante: Json
        }[]
      }
      create_archivo_if_provided: {
        Args: { doc_details: Json }
        Returns: number
      }
      create_cliente_completo: {
        Args: {
          tipo_persona_input: string
          persona_data_input: Json
          perfil_data_input: Json
        }
        Returns: number
      }
      get_all_user_profiles: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          email: string
          last_sign_in_at: string
          email_confirmed_at: string
          perfil_cliente: Json
          perfil_operacional: Json
        }[]
      }
      gtrgm_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      gtrgm_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      search_clientes: {
        Args: { search_term_in: string }
        Returns: {
          id: number
          nombre: string
          identificacion: string
          tipo: string
          rol: Database["public"]["Enums"]["perfil_cliente_rol"]
        }[]
      }
      set_limit: {
        Args: { "": number }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: { "": string }
        Returns: string[]
      }
    }
    Enums: {
      configuracion_frecuencia:
        | "Mensual"
        | "Bimestral"
        | "Trimestral"
        | "Semestral"
        | "Anual"
      factura_estado:
        | "Borrador"
        | "PendienteValidacion"
        | "Aprobada"
        | "Enviada"
        | "Pagada"
        | "Vencida"
        | "Anulada"
        | "PagadaConComprobante"
        | "Parcial"
      pago_estado:
        | "PendienteVerificacion"
        | "Verificado"
        | "Rechazado"
        | "Conciliado"
      pago_metodo:
        | "Transferencia"
        | "Cheque"
        | "Efectivo"
        | "TarjetaCredito"
        | "TarjetaDebito"
        | "Otro"
      perfil_cliente_rol: "Propietario" | "Arrendatario" | "Externo"
      perfil_cliente_tipo_persona: "Natural" | "Juridica"
      perfil_operacional_rol: "Jefe Operativo" | "Administrador" | "Directorio"
      propiedad_actividad:
        | "No definida"
        | "Comercio y distribucion"
        | "Venta al por mayor y menor"
        | "Distribucion equipos electronicos"
        | "Almacenaje y dist. alimentos"
        | "Distribucion ropa o textiles"
        | "Servicios de logistica"
        | "Almacenaje y gestion inventarios"
        | "Servicios transporte y distribucion"
        | "E-commerce y envio productos"
        | "Manufactura y ensamblaje"
        | "Ensamblaje productos electronicos"
        | "Fabricacion productos pequenos"
        | "Imprentas y serigrafia"
        | "Carpinteria o fabricacion muebles"
        | "Servicios de tecnologia"
        | "Reparacion equipos electronicos"
        | "Desarrollo software o aplicaciones"
        | "Soporte tecnico e informatica"
        | "Diseno grafico y multimedia"
        | "Oficina administrativa"
        | "Consultoria (financiera, legal, RRHH)"
        | "Agencias de marketing digital"
        | "Gestion de proyectos o eventos"
        | "Servicios contables y auditoria"
        | "Alquiler de espacios"
        | "Alquiler bodegas almacenamiento"
        | "Alquiler oficinas compartidas"
        | "Servicios de impresion"
        | "Impresion gran formato"
        | "Servicios fotocopiado y escaneo"
        | "Impresion material publicitario"
        | "Comercio repuestos o autopartes"
        | "Venta piezas y repuestos vehiculos"
        | "Venta equipos y herramientas esp."
        | "Agencias de seguridad"
        | "Venta y dist. sistemas seguridad"
        | "Instalacion equipos seguridad"
        | "Artes y entretenimiento"
        | "Estudio foto o video"
        | "Taller pintura o escultura"
        | "Produccion eventos o espectaculos"
        | "Servicios reparacion y mantenimiento"
        | "Reparacion electrodomesticos"
        | "Reparacion computadoras"
        | "Mantenimiento maquinaria vehiculos"
        | "Servicios educativos"
        | "Centro formacion o capacitacion"
        | "Clases computacion o diseno"
        | "Talleres y cursos especializados"
        | "Cuidado personal"
        | "Centro estetica o peluqueria"
        | "Gimnasio o centro entrenamiento"
        | "Restauracion y alimentos"
        | "Produccion alimentos empaquetados"
        | "Fabricacion panaderia reposteria"
      propiedad_estado_construccion:
        | "enPlanos"
        | "terreno"
        | "enConstruccion"
        | "obraGris"
        | "acabados"
        | "finalizada"
        | "remodelacion"
        | "demolicion"
        | "abandonada"
        | "paralizada"
      propiedad_estado_entrega: "entregado" | "noEntregado"
      propiedad_estado_uso: "enUso" | "disponible"
      servicio_tipo: "CuotaRecurrente" | "ServicioAdicional" | "Ajuste" | "Otro"
      ticket_estado: "abierto" | "en_progreso" | "resuelto" | "cerrado"
      ticket_prioridad: "baja" | "media" | "alta"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      configuracion_frecuencia: [
        "Mensual",
        "Bimestral",
        "Trimestral",
        "Semestral",
        "Anual",
      ],
      factura_estado: [
        "Borrador",
        "PendienteValidacion",
        "Aprobada",
        "Enviada",
        "Pagada",
        "Vencida",
        "Anulada",
        "PagadaConComprobante",
        "Parcial",
      ],
      pago_estado: [
        "PendienteVerificacion",
        "Verificado",
        "Rechazado",
        "Conciliado",
      ],
      pago_metodo: [
        "Transferencia",
        "Cheque",
        "Efectivo",
        "TarjetaCredito",
        "TarjetaDebito",
        "Otro",
      ],
      perfil_cliente_rol: ["Propietario", "Arrendatario", "Externo"],
      perfil_cliente_tipo_persona: ["Natural", "Juridica"],
      perfil_operacional_rol: ["Jefe Operativo", "Administrador", "Directorio"],
      propiedad_actividad: [
        "No definida",
        "Comercio y distribucion",
        "Venta al por mayor y menor",
        "Distribucion equipos electronicos",
        "Almacenaje y dist. alimentos",
        "Distribucion ropa o textiles",
        "Servicios de logistica",
        "Almacenaje y gestion inventarios",
        "Servicios transporte y distribucion",
        "E-commerce y envio productos",
        "Manufactura y ensamblaje",
        "Ensamblaje productos electronicos",
        "Fabricacion productos pequenos",
        "Imprentas y serigrafia",
        "Carpinteria o fabricacion muebles",
        "Servicios de tecnologia",
        "Reparacion equipos electronicos",
        "Desarrollo software o aplicaciones",
        "Soporte tecnico e informatica",
        "Diseno grafico y multimedia",
        "Oficina administrativa",
        "Consultoria (financiera, legal, RRHH)",
        "Agencias de marketing digital",
        "Gestion de proyectos o eventos",
        "Servicios contables y auditoria",
        "Alquiler de espacios",
        "Alquiler bodegas almacenamiento",
        "Alquiler oficinas compartidas",
        "Servicios de impresion",
        "Impresion gran formato",
        "Servicios fotocopiado y escaneo",
        "Impresion material publicitario",
        "Comercio repuestos o autopartes",
        "Venta piezas y repuestos vehiculos",
        "Venta equipos y herramientas esp.",
        "Agencias de seguridad",
        "Venta y dist. sistemas seguridad",
        "Instalacion equipos seguridad",
        "Artes y entretenimiento",
        "Estudio foto o video",
        "Taller pintura o escultura",
        "Produccion eventos o espectaculos",
        "Servicios reparacion y mantenimiento",
        "Reparacion electrodomesticos",
        "Reparacion computadoras",
        "Mantenimiento maquinaria vehiculos",
        "Servicios educativos",
        "Centro formacion o capacitacion",
        "Clases computacion o diseno",
        "Talleres y cursos especializados",
        "Cuidado personal",
        "Centro estetica o peluqueria",
        "Gimnasio o centro entrenamiento",
        "Restauracion y alimentos",
        "Produccion alimentos empaquetados",
        "Fabricacion panaderia reposteria",
      ],
      propiedad_estado_construccion: [
        "enPlanos",
        "terreno",
        "enConstruccion",
        "obraGris",
        "acabados",
        "finalizada",
        "remodelacion",
        "demolicion",
        "abandonada",
        "paralizada",
      ],
      propiedad_estado_entrega: ["entregado", "noEntregado"],
      propiedad_estado_uso: ["enUso", "disponible"],
      servicio_tipo: ["CuotaRecurrente", "ServicioAdicional", "Ajuste", "Otro"],
      ticket_estado: ["abierto", "en_progreso", "resuelto", "cerrado"],
      ticket_prioridad: ["baja", "media", "alta"],
    },
  },
} as const