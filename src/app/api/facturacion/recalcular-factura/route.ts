import { NextResponse } from 'next/server';
import { createClient } from '../../../../../lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const data = await request.json();

    const { 
      facturaId, 
      tasa_base_especial, 
      aplica_iva, 
      porcentaje_iva, 
      area_propiedad, 
      solo_factura_actual 
    } = data;

    // Validaciones
    if (!facturaId) {
      return NextResponse.json(
        { message: 'ID de factura no proporcionado' },
        { status: 400 }
      );
    }

    // Obtener la factura actual
    const { data: factura, error: facturaError } = await supabase
      .from('facturas')
      .select(`
        id, 
        items_factura, 
        subtotal, 
        monto_iva, 
        total, 
        propiedad_id, 
        cliente_id
      `)
      .eq('id', facturaId)
      .single();

    if (facturaError) {
      console.error('Error al obtener factura:', facturaError);
      return NextResponse.json(
        { message: 'Error al obtener la factura' },
        { status: 500 }
      );
    }

    if (!factura) {
      return NextResponse.json(
        { message: 'Factura no encontrada' },
        { status: 404 }
      );
    }

    // Verificar que la propiedad existe
    const { data: propiedadExiste, error: propiedadError } = await supabase
      .from('propiedades')
      .select('id')
      .eq('id', factura.propiedad_id)
      .single();

    if (propiedadError || !propiedadExiste) {
      console.error('Error: La propiedad no existe:', propiedadError);
      return NextResponse.json(
        { message: 'La propiedad asociada a esta factura no existe' },
        { status: 400 }
      );
    }

    // Obtener el servicio_id a partir del código del servicio
    const codigoServicio = factura.items_factura[0]?.codigoServicio;
    let servicioId = 0;

    if (codigoServicio) {
      const { data: servicio, error: servicioError } = await supabase
        .from('servicios')
        .select('id')
        .eq('codigo', codigoServicio)
        .single();
      
      if (servicio && !servicioError) {
        servicioId = servicio.id;
      } else {
        console.log('No se encontró el servicio con código:', codigoServicio);
      }
    }

    // Recalcular según la tasa especial o IVA
    let nuevosItemsFactura = [...factura.items_factura];
    let nuevoSubtotal = 0;
    let nuevoIVA = 0;
    let nuevoTotal = 0;

    // Obtener el precio unitario actual de la factura
    const precioUnitarioActual = factura.items_factura[0]?.precioUnitario || 0;
    const cantidadActual = factura.items_factura[0]?.cantidad || 1;
    
    // Si hay una tasa base especial, la aplicamos
    if (tasa_base_especial !== null && area_propiedad > 0) {
      // Modificar el precio unitario en los items de la factura
      nuevosItemsFactura = factura.items_factura.map((item: any) => ({
        ...item,
        precioUnitario: tasa_base_especial,
        porcentajeIva: aplica_iva ? porcentaje_iva : 0
      }));

      // Recalcular totales
      nuevoSubtotal = area_propiedad * tasa_base_especial;
      
      if (aplica_iva && porcentaje_iva) {
        nuevoIVA = nuevoSubtotal * porcentaje_iva;
      }
      
      nuevoTotal = nuevoSubtotal + nuevoIVA;
    } 
    // Si solo se aplica IVA (sin cambiar la tasa base)
    else if (aplica_iva) {
      // Mantener el precio unitario pero actualizar el porcentaje de IVA
      nuevosItemsFactura = factura.items_factura.map((item: any) => ({
        ...item,
        porcentajeIva: porcentaje_iva
      }));

      // Mantener el subtotal existente
      nuevoSubtotal = factura.subtotal;
      
      // Calcular nuevo IVA basado en el subtotal existente
      if (porcentaje_iva) {
        nuevoIVA = nuevoSubtotal * porcentaje_iva;
      }
      
      nuevoTotal = nuevoSubtotal + nuevoIVA;
    } else {
      // No hay cambios, mantener los valores actuales
      return NextResponse.json({
        message: 'No se aplicaron cambios a la factura',
        factura: factura
      });
    }

    // Redondear valores a 2 decimales para evitar errores de precisión
    nuevoSubtotal = parseFloat(nuevoSubtotal.toFixed(2));
    nuevoIVA = parseFloat(nuevoIVA.toFixed(2));
    nuevoTotal = parseFloat(nuevoTotal.toFixed(2));

    // Actualizar la factura con los nuevos valores
    const { data: facturaActualizada, error: actualizacionError } = await supabase
      .from('facturas')
      .update({
        items_factura: nuevosItemsFactura,
        subtotal: nuevoSubtotal,
        monto_iva: nuevoIVA,
        total: nuevoTotal,
        updated_at: new Date().toISOString()
      })
      .eq('id', facturaId)
      .select();

    if (actualizacionError) {
      console.error('Error al actualizar factura:', actualizacionError);
      return NextResponse.json(
        { message: 'Error al actualizar la factura' },
        { status: 500 }
      );
    }

    // Si no es solo para esta factura, guardar la configuración
    if (!solo_factura_actual && servicioId > 0) {
      // Verificar que el cliente existe
      const { data: clienteExiste, error: clienteError } = await supabase
        .from('perfiles_cliente')
        .select('id')
        .eq('id', factura.cliente_id)
        .single();

      if (clienteError || !clienteExiste) {
        console.error('Error: El cliente no existe:', clienteError);
        return NextResponse.json(
          { 
            message: 'No se pudo guardar la configuración: el cliente asociado no existe',
            factura: facturaActualizada 
          },
          { status: 200 }
        );
      }

      // Verificar que tenemos un ID de propiedad válido
      if (!factura.propiedad_id || factura.propiedad_id <= 0) {
        console.error('Error: ID de propiedad inválido:', factura.propiedad_id);
        return NextResponse.json(
          { 
            message: 'No se pudo guardar la configuración: ID de propiedad inválido',
            factura: facturaActualizada 
          },
          { status: 200 }
        );
      }

      // Primero verificar si ya existe una configuración
      const { data: configuracionExistente, error: errorConsulta } = await supabase
        .from('configuraciones_facturacion')
        .select('id')
        .eq('propiedad_id', factura.propiedad_id)
        .eq('cliente_id', factura.cliente_id)
        .eq('servicio_id', servicioId)
        .eq('activo', true);

      if (errorConsulta && errorConsulta.code !== 'PGRST116') {
        console.error('Error al consultar configuración:', errorConsulta);
      }

      try {
        // Determinar operación: actualizar o insertar
        if (configuracionExistente && configuracionExistente.length > 0) {
          console.log('Actualizando configuración existente, ID:', configuracionExistente[0].id);
          const { error: updateError } = await supabase
            .from('configuraciones_facturacion')
            .update({
              aplica_iva_general: aplica_iva,
              porcentaje_iva_general: aplica_iva ? porcentaje_iva : null,
              tasa_base_especial: tasa_base_especial,
              updated_at: new Date().toISOString()
            })
            .eq('id', configuracionExistente[0].id);
            
          if (updateError) {
            console.error('Error al actualizar configuración:', updateError);
          }
        } else {
          console.log('Insertando nueva configuración:', {
            propiedad_id: factura.propiedad_id,
            cliente_id: factura.cliente_id,
            servicio_id: servicioId
          });
          const { error: insertError } = await supabase
            .from('configuraciones_facturacion')
            .insert([{
              propiedad_id: factura.propiedad_id,
              cliente_id: factura.cliente_id,
              servicio_id: servicioId,
              aplica_iva_general: aplica_iva,
              porcentaje_iva_general: aplica_iva ? porcentaje_iva : null,
              tasa_base_especial: tasa_base_especial,
              activo: true
            }]);
            
          if (insertError) {
            console.error('Error al insertar configuración:', insertError);
          }
        }
      } catch (configError: any) {
        console.error('Error al guardar configuración:', configError);
        return NextResponse.json({
          message: 'Factura recalculada, pero hubo un error al guardar la configuración',
          error: configError.message,
          factura: facturaActualizada
        });
      }
    }

    return NextResponse.json({
      message: 'Factura recalculada correctamente',
      factura: facturaActualizada
    });
  } catch (error: any) {
    console.error('Error en recalcular-factura:', error);
    return NextResponse.json(
      { message: error.message || 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
} 