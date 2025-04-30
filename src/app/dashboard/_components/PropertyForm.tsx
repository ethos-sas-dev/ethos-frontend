import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Button } from "../../_components/ui/button";
import { Input } from "../../_components/ui/input";
import { Label } from "../../_components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../../_components/ui/select";
import { Switch } from "../../_components/ui/switch";
import {
    ExclamationTriangleIcon,
    PlusIcon,
    TrashIcon
} from "@heroicons/react/24/outline";
import {
    propiedad_actividad,
    propiedad_estado_construccion,
    IDENTIFICADORES_SUPERIOR,
    IDENTIFICADORES_INTERMEDIO,
    IDENTIFICADORES_INFERIOR,
    ESTADOS_ENTREGA,
    ENCARGADOS_PAGO,
    TIPOS_AREA
} from "../../../lib/enums";
import { formatNumber } from "../../../lib/utils";

// --- Tipos (Duplicados de editar/page.tsx por ahora, se pueden mover a un archivo común) ---
interface AreaDesglosadaItem {
    id?: string | number;
    area: number | null;
    tipo_area: typeof TIPOS_AREA[number]['value'] | null;
    nombre_adicional?: string | null;
}

type IdentificadoresData = {
    superior: typeof IDENTIFICADORES_SUPERIOR[number]['value'] | null;
    idSuperior: string;
    intermedio?: typeof IDENTIFICADORES_INTERMEDIO[number]['value'] | null;
    idIntermedio?: string;
    inferior: typeof IDENTIFICADORES_INFERIOR[number]['value'] | null;
    idInferior: string;
};

type PagosData = {
    encargadoDePago: typeof ENCARGADOS_PAGO[number]['value'] | null;
}

export type PropertyFormData = { // Exportar para que la página la use
    identificadores: IdentificadoresData;
    codigo_catastral: string;
    estado_entrega: typeof ESTADOS_ENTREGA[number]['value'] | null;
    actividad: string | null;
    estado_de_construccion: string | null;
    usarAreasDesglosadas: boolean;
    area_total: number | null;
    areas_desglosadas: AreaDesglosadaItem[];
    encargado_pago: typeof ENCARGADOS_PAGO[number]['value'] | null;
    monto_fondo_inicial: number | null; // Mantenido aquí, calculado antes de submit
    monto_alicuota_ordinaria: number | null; // Mantenido aquí, calculado antes de submit
};

type ProjectData = {
    tasa_base_fondo_inicial: number | null;
    tasa_base_alicuota_ordinaria: number | null;
};

// --- Props del Componente ---
interface PropertyFormProps {
    initialData: Partial<PropertyFormData>; // Partial permite datos iniciales incompletos para 'crear'
    projectData: ProjectData | null;
    onSubmit: (data: any) => Promise<void>; // Recibirá el payload listo para API
    onCancel: () => void;
    isSaving: boolean;
    mode: 'create' | 'edit';
}

// --- Estado Inicial Default (para modo 'create') ---
const defaultInitialData: PropertyFormData = {
    identificadores: {
        superior: null,
        idSuperior: '',
        intermedio: null,
        idIntermedio: '',
        inferior: null,
        idInferior: '',
    },
    codigo_catastral: '',
    estado_entrega: 'noEntregado',
    actividad: null,
    estado_de_construccion: null,
    usarAreasDesglosadas: false,
    area_total: null,
    areas_desglosadas: [],
    encargado_pago: 'Propietario',
    monto_fondo_inicial: null,
    monto_alicuota_ordinaria: null,
};

// Type for options used in Select components
type SelectOption = { value: string; label: string };

// --- Componente del Formulario ---
export function PropertyForm({
    initialData,
    projectData,
    onSubmit,
    onCancel,
    isSaving,
    mode
}: PropertyFormProps) {

    const [formData, setFormData] = useState<PropertyFormData>({
        ...defaultInitialData, // Empieza con defaults
        ...initialData // Sobreescribe con datos iniciales si existen (modo edit)
    });
    const [error, setError] = useState<string | null>(null); // Error interno del form si es necesario

    // --- Efecto para inicializar/resetear el estado cuando initialData cambie ---
    useEffect(() => {
        const hasAreasDesglosadas = Array.isArray(initialData?.areas_desglosadas) && initialData.areas_desglosadas.length > 0;
        setFormData({
            identificadores: {
                superior: initialData?.identificadores?.superior || null,
                idSuperior: initialData?.identificadores?.idSuperior || '',
                intermedio: initialData?.identificadores?.intermedio || null,
                idIntermedio: initialData?.identificadores?.idIntermedio || '',
                inferior: initialData?.identificadores?.inferior || null,
                idInferior: initialData?.identificadores?.idInferior || '',
            },
            codigo_catastral: initialData?.codigo_catastral || '',
            estado_entrega: initialData?.estado_entrega || 'noEntregado',
            actividad: initialData?.actividad || null,
            estado_de_construccion: initialData?.estado_de_construccion || null,
            usarAreasDesglosadas: hasAreasDesglosadas,
            area_total: initialData?.area_total ?? null, // Usar ?? para manejar 0 correctamente
            // Aseguramos que `initialData.areas_desglosadas` es un array antes de mapear
            areas_desglosadas: (initialData?.areas_desglosadas ?? []).map((area: AreaDesglosadaItem) => ({ // Tipo explícito para area
                id: area.id,
                area: area.area ?? null, // Usar ??
                tipo_area: area.tipo_area || null,
                nombre_adicional: area.nombre_adicional || null
            })),
            encargado_pago: initialData?.encargado_pago || 'Propietario',
            monto_fondo_inicial: initialData?.monto_fondo_inicial ?? null, // Usar ??
            monto_alicuota_ordinaria: initialData?.monto_alicuota_ordinaria ?? null, // Usar ??
        });
    }, [initialData]); // Ejecutar cuando initialData cambie


    // --- Handlers (idénticos a los de editar/page.tsx) ---
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
         const { name, value, type } = e.target;
         const keys = name.split('.'); // Handle nested state like identificadores.idSuperior

         setFormData(prev => {
             let newState = { ...prev };
             let currentLevel: any = newState;

             for (let i = 0; i < keys.length - 1; i++) {
                 if (!currentLevel[keys[i]]) {
                     currentLevel[keys[i]] = {};
                 }
                 currentLevel = currentLevel[keys[i]];
             }

             const finalKey = keys[keys.length - 1];
             currentLevel[finalKey] = type === 'number' ? (value === '' ? null : Number(value)) : value;

             // Recalculate total area if a desglose area changes OR if area_total changes directly
             if (name.startsWith('areas_desglosadas') && name.endsWith('.area')) {
                 if (newState.usarAreasDesglosadas) {
                     newState.area_total = calculateTotalArea(newState.areas_desglosadas);
                 }
             } else if (name === 'area_total' && !newState.usarAreasDesglosadas) {
                 // Update area_total directly if not using desglose
                 newState.area_total = value === '' ? null : Number(value);
             }


             return newState;
         });
     };

    const handleSelectChange = (name: string, value: string) => {
        const keys = name.split('.');
        setFormData(prev => {
             let newState = { ...prev };
             let currentLevel: any = newState;
             for (let i = 0; i < keys.length - 1; i++) {
                 if (!currentLevel[keys[i]]) {
                     currentLevel[keys[i]] = {};
                 }
                 currentLevel = currentLevel[keys[i]];
             }
             const finalKey = keys[keys.length - 1];
             currentLevel[finalKey] = value === 'NONE' ? null : value;
             return newState;
         });
    };

    const handleSwitchChange = (name: keyof PropertyFormData, checked: boolean) => {
         setFormData(prev => {
            const newState = { ...prev, [name]: checked };
             // If switching OFF usarAreasDesglosadas, reset areas_desglosadas
             if (name === 'usarAreasDesglosadas' && !checked) {
                 newState.areas_desglosadas = [];
                 // Optionally keep area_total or reset it based on preference
                 // newState.area_total = null; // or keep prev.area_total
             }
             // If switching ON and no areas exist, add one based on area_total
             else if (name === 'usarAreasDesglosadas' && checked && newState.areas_desglosadas.length === 0) {
                 newState.areas_desglosadas = [{
                     id: `temp-${Date.now()}`,
                     area: newState.area_total ?? 0, // Use current total area if available
                     tipo_area: 'util', // Default to 'util' or 'adicional'
                     nombre_adicional: ''
                 }];
                 newState.area_total = calculateTotalArea(newState.areas_desglosadas); // Recalculate
             }
             return newState;
         });
     };

    // --- Funciones Área Desglosada (idénticas) ---
     const addAreaDesglosada = (initialArea: number = 0) => {
         setFormData(prev => {
             const newArea: AreaDesglosadaItem = {
                 id: `temp-${Date.now()}`,
                 area: initialArea,
                 tipo_area: 'adicional',
                 nombre_adicional: ''
             };
             const updatedAreas = [...prev.areas_desglosadas, newArea];
             return {
                 ...prev,
                 areas_desglosadas: updatedAreas,
                 area_total: calculateTotalArea(updatedAreas)
             };
         });
     };

     const removeAreaDesglosada = (index: number) => {
         setFormData(prev => {
             const updatedAreas = prev.areas_desglosadas.filter((_, i) => i !== index);
             const newTotalArea = calculateTotalArea(updatedAreas);
             return {
                 ...prev,
                 areas_desglosadas: updatedAreas,
                 area_total: newTotalArea,
                 usarAreasDesglosadas: updatedAreas.length > 0, // Switch off if last item removed
             };
         });
     };

     const handleAreaDesglosadaChange = (index: number, field: keyof AreaDesglosadaItem, value: string | number | null) => {
         setFormData(prev => {
             const updatedAreas = prev.areas_desglosadas.map((item, i) => {
                 if (i === index) {
                     // Ensure area is treated as number or null
                     const newValue = field === 'area' ? (value === '' ? null : Number(value)) : value;
                     return { ...item, [field]: newValue };
                 }
                 return item;
             });
             const newTotalArea = calculateTotalArea(updatedAreas);
             return {
                 ...prev,
                 areas_desglosadas: updatedAreas,
                 area_total: newTotalArea,
             };
         });
     };

    // --- Funciones Cálculo (idénticas) ---
    const calculateTotalArea = (areas: AreaDesglosadaItem[]): number | null => {
         if (!areas || areas.length === 0) return null;
         const total = areas.reduce((sum, area) => sum + (Number(area.area) || 0), 0);
         return parseFloat(total.toFixed(2));
     };

    const calculateMontos = (): { montoFondoInicial: number | null; montoAlicuotaOrdinaria: number | null } => {
        const tasaBaseFondoInicial = projectData?.tasa_base_fondo_inicial ?? 0;
        const tasaBaseAlicuotaOrdinaria = projectData?.tasa_base_alicuota_ordinaria ?? 0;
        // El área total ya está calculada y en el estado formData.area_total
        const areaTotalCalculated = formData.area_total;

        if (areaTotalCalculated === null || areaTotalCalculated === undefined) {
            return { montoFondoInicial: null, montoAlicuotaOrdinaria: null };
        }

        const fondoInicial = parseFloat((areaTotalCalculated * tasaBaseFondoInicial).toFixed(2));
        const alicuotaOrdinaria = parseFloat((areaTotalCalculated * tasaBaseAlicuotaOrdinaria).toFixed(2));

        return { montoFondoInicial: fondoInicial, montoAlicuotaOrdinaria: alicuotaOrdinaria };
    };

    // --- Submit Handler Interno ---
    const handleInternalSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null); // Reset local error

        // Recalculate montos just before submitting
        const { montoFondoInicial, montoAlicuotaOrdinaria } = calculateMontos();

        // Preparar payload final
        const finalPayload = {
             // proyecto_id needs to be added by the parent 'create' page
            identificadores: {
                superior: formData.identificadores.superior,
                idSuperior: formData.identificadores.idSuperior,
                intermedio: formData.identificadores.intermedio,
                idIntermedio: formData.identificadores.idIntermedio,
                inferior: formData.identificadores.inferior,
                idInferior: formData.identificadores.idInferior,
            },
            codigo_catastral: formData.codigo_catastral || null,
            estado_entrega: formData.estado_entrega,
            actividad: formData.actividad,
            estado_de_construccion: formData.estado_de_construccion,
            area_total: formData.area_total,
            areas_desglosadas: formData.usarAreasDesglosadas
                ? formData.areas_desglosadas.map(({ id, ...rest }: AreaDesglosadaItem) => { // Add type here
                    if (typeof id === 'string' && id.startsWith('temp-')) {
                        // Fix: Return only relevant fields, handle potential undefined
                        return {
                             area: rest.area ?? null,
                             tipo_area: rest.tipo_area ?? null,
                             nombre_adicional: rest.nombre_adicional ?? null
                        };
                    }
                    // Fix: Return only relevant fields for existing items
                    return { area: rest.area ?? null, tipo_area: rest.tipo_area ?? null, nombre_adicional: rest.nombre_adicional ?? null };
                })
                : [],
            encargado_pago: formData.encargado_pago,
            monto_fondo_inicial: montoFondoInicial,
            monto_alicuota_ordinaria: montoAlicuotaOrdinaria,
            // 'estado_uso' will likely default to 'disponible' in the DB for creation
            // 'created_at', 'updated_at' handled by DB
        };

        try {
            await onSubmit(finalPayload); // Llamar a la función onSubmit del padre
        } catch (submitError: any) {
            console.error("Error submitting form:", submitError);
            setError(submitError.message || "Ocurrió un error al guardar.");
        }
    };


    // --- JSX del Formulario (movido desde editar/page.tsx) ---
    return (
        <form onSubmit={handleInternalSubmit} className="bg-white rounded-xl border p-6 md:p-8 shadow-sm space-y-8">

            {/* Mostrar Error local del formulario */}
            {error && (
                <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg" role="alert">
                    <span className="font-medium">Error:</span> {error}
                </div>
            )}

            {/* Identificadores */}
            <fieldset className="space-y-4 border p-4 rounded-md">
                <legend className="text-sm font-medium px-1">Identificadores Únicos</legend>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                        <Label htmlFor="identificadores.superior">Nivel Superior</Label>
                        <Select
                            name="identificadores.superior"
                            value={formData.identificadores.superior ?? 'NONE'}
                            onValueChange={(value: string) => handleSelectChange('identificadores.superior', value)}
                        >
                            <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Seleccione tipo..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="NONE" disabled>Seleccione tipo...</SelectItem>
                                {IDENTIFICADORES_SUPERIOR.map((opt: SelectOption) => (
                                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Input
                            name="identificadores.idSuperior"
                            value={formData.identificadores.idSuperior}
                            onChange={handleInputChange}
                            placeholder={`ID ${formData.identificadores.superior || 'Superior'}...`}
                            className="mt-2"
                            required
                        />
                    </div>
                    <div>
                        <Label htmlFor="identificadores.intermedio">Nivel Intermedio (Opcional)</Label>
                        <Select
                            name="identificadores.intermedio"
                            value={formData.identificadores.intermedio ?? 'NONE'}
                            onValueChange={(value: string) => handleSelectChange('identificadores.intermedio', value)}
                        >
                            <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Seleccione tipo..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="NONE">-- Ninguno --</SelectItem>
                                {IDENTIFICADORES_INTERMEDIO.map((opt: SelectOption) => (
                                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Input
                            name="identificadores.idIntermedio"
                            value={formData.identificadores.idIntermedio ?? ''}
                            onChange={handleInputChange}
                            placeholder={`ID ${formData.identificadores.intermedio || 'Intermedio'}...`}
                            className="mt-2"
                            required={!!formData.identificadores.intermedio}
                            disabled={!formData.identificadores.intermedio}
                        />
                    </div>
                    <div>
                        <Label htmlFor="identificadores.inferior">Nivel Inferior</Label>
                        <Select
                            name="identificadores.inferior"
                            value={formData.identificadores.inferior ?? 'NONE'}
                            onValueChange={(value: string) => handleSelectChange('identificadores.inferior', value)}
                        >
                            <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Seleccione tipo..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="NONE" disabled>Seleccione tipo...</SelectItem>
                                {IDENTIFICADORES_INFERIOR.map((opt: SelectOption) => (
                                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Input
                            name="identificadores.idInferior"
                            value={formData.identificadores.idInferior}
                            onChange={handleInputChange}
                            placeholder={`ID ${formData.identificadores.inferior || 'Inferior'}...`}
                            className="mt-2"
                            required
                        />
                    </div>
                </div>
            </fieldset>

            {/* Otros campos principales */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Codigo Catastral */}
                <div>
                    <Label htmlFor="codigo_catastral">Código Catastral</Label>
                    <Input
                        id="codigo_catastral"
                        name="codigo_catastral"
                        value={formData.codigo_catastral}
                        onChange={handleInputChange}
                        className="mt-1"
                        placeholder="Ej: 01-0001-001-0001..."
                    />
                </div>

                {/* Estado Entrega */}
                <div>
                    <Label htmlFor="estado_entrega">Estado Entrega</Label>
                    <Select
                        name="estado_entrega"
                        value={formData.estado_entrega ?? 'noEntregado'}
                        onValueChange={(value: string) => handleSelectChange('estado_entrega', value)}
                    >
                        <SelectTrigger className="mt-1">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {ESTADOS_ENTREGA.map((opt: SelectOption) => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Encargado de Pago */}
                <div>
                    <Label htmlFor="encargado_pago">Encargado de Pago</Label>
                    <Select
                        name="encargado_pago"
                        value={formData.encargado_pago ?? 'Propietario'}
                        onValueChange={(value: string) => handleSelectChange('encargado_pago', value)}
                    >
                        <SelectTrigger className="mt-1">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {ENCARGADOS_PAGO.map((opt: SelectOption) => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Actividad Principal */}
                <div>
                    <Label htmlFor="actividad">Actividad Principal</Label>
                    <Select
                        name="actividad"
                        value={formData.actividad ?? 'NONE'}
                        onValueChange={(value: string) => handleSelectChange('actividad', value)}
                    >
                        <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Seleccione una actividad..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="NONE">-- No definida --</SelectItem>
                            {propiedad_actividad.map((act: string) => (
                                <SelectItem key={act} value={act}>{act}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Estado Construcción */}
                <div>
                    <Label htmlFor="estado_de_construccion">Estado Construcción</Label>
                    <Select
                        name="estado_de_construccion"
                        value={formData.estado_de_construccion ?? 'NONE'}
                        onValueChange={(value: string) => handleSelectChange('estado_de_construccion', value)}
                    >
                        <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Seleccione un estado..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="NONE">-- No definido --</SelectItem>
                            {propiedad_estado_construccion.map((est: string) => (
                                <SelectItem key={est} value={est}>{est.replace(/([A-Z])/g, ' $1').replace(/^./, (str: string) => str.toUpperCase())}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Sección de Áreas */}
            <fieldset className="space-y-4 border p-6 rounded-md">
                <legend className="text-sm font-medium px-1">Gestión de Áreas</legend>
                <div className="flex items-center space-x-2 pt-2">
                    <Switch
                        id="usarAreasDesglosadas"
                        checked={formData.usarAreasDesglosadas}
                        onCheckedChange={(checked: boolean) => handleSwitchChange('usarAreasDesglosadas', checked)}
                    />
                    <Label htmlFor="usarAreasDesglosadas">¿Usar áreas desglosadas?</Label>
                </div>

                {!formData.usarAreasDesglosadas ? (
                    <div className="pt-2">
                        <Label htmlFor="area_total">Área Total (m²)</Label>
                        <Input
                            id="area_total"
                            name="area_total"
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.area_total ?? ''}
                            onChange={handleInputChange}
                            className="mt-1"
                            placeholder="0.00"
                            required={!formData.usarAreasDesglosadas}
                        />
                    </div>
                ) : (
                    <div className="space-y-4 pt-2">
                        {formData.areas_desglosadas.map((item, index) => (
                            <div key={item.id || index} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-4 items-end p-4 border rounded-md bg-gray-50/50">
                                {/* Tipo de Área */}
                                <div>
                                    <Label htmlFor={`areas_desglosadas.${index}.tipo_area`}>Tipo Área</Label>
                                    <Select
                                        name={`areas_desglosadas.${index}.tipo_area`}
                                        value={item.tipo_area ?? 'NONE'}
                                        onValueChange={(value: string) => handleAreaDesglosadaChange(index, 'tipo_area', value === 'NONE' ? null : value)}
                                    >
                                        <SelectTrigger className="mt-1">
                                            <SelectValue placeholder="Seleccione..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="NONE">-- Seleccione --</SelectItem>
                                            {TIPOS_AREA.map((opt: SelectOption) => (
                                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                {/* Área (m²) */}
                                <div>
                                    <Label htmlFor={`areas_desglosadas.${index}.area`}>Área (m²)</Label>
                                    <Input
                                        id={`areas_desglosadas.${index}.area`}
                                        name={`areas_desglosadas.${index}.area`}
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={item.area ?? ''}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleAreaDesglosadaChange(index, 'area', e.target.value)}
                                        className="mt-1"
                                        placeholder="0.00"
                                        required
                                    />
                                </div>
                                {/* Nombre Adicional */}
                                <div className={`${item.tipo_area === 'adicional' ? '' : 'sm:invisible'}`}>
                                    <Label htmlFor={`areas_desglosadas.${index}.nombre_adicional`}>
                                        Nombre Adicional
                                    </Label>
                                    <Input
                                        id={`areas_desglosadas.${index}.nombre_adicional`}
                                        name={`areas_desglosadas.${index}.nombre_adicional`}
                                        value={item.nombre_adicional ?? ''}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleAreaDesglosadaChange(index, 'nombre_adicional', e.target.value)}
                                        className="mt-1"
                                        placeholder="Ej: Mezzanine"
                                        disabled={item.tipo_area !== 'adicional'}
                                        aria-hidden={item.tipo_area !== 'adicional'}
                                    />
                                </div>
                                {/* Botón Eliminar */}
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeAreaDesglosada(index)}
                                    className="text-red-500 hover:bg-red-100 h-9 w-9 self-end"
                                    aria-label="Eliminar área"
                                >
                                    <TrashIcon className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => addAreaDesglosada()}
                            className="mt-2"
                        >
                            <PlusIcon className="h-4 w-4 mr-2" /> Añadir Área Desglosada
                        </Button>
                        <div className="mt-4 p-3 bg-gray-100 rounded-md text-sm">
                            <strong>Área Total Calculada:</strong> {formatNumber(formData.area_total ?? 0)} m²
                        </div>
                    </div>
                )}
            </fieldset>

            {/* Sección de Montos Calculados */}
            <fieldset className="space-y-3 border p-4 rounded-md bg-slate-50">
                <legend className="text-sm font-medium px-1">Montos Calculados</legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                        <p className="text-gray-600">Fondo Inicial Calculado</p>
                        <p className="font-semibold text-lg mt-0.5">
                            ${formatNumber(calculateMontos().montoFondoInicial ?? 0)}
                        </p>
                    </div>
                    <div>
                        <p className="text-gray-600">Alícuota Ordinaria Calculada</p>
                        <p className="font-semibold text-lg mt-0.5">
                            ${formatNumber(calculateMontos().montoAlicuotaOrdinaria ?? 0)}
                        </p>
                    </div>
                </div>
                <p className="text-xs text-gray-500 italic">
                    Estos montos se basan en el área total y las tasas base del proyecto. Se guardarán al {mode === 'create' ? 'crear' : 'actualizar'}.
                </p>
            </fieldset>

            {/* Botones Submit/Cancel */}
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
                    Cancelar
                </Button>
                <Button type="submit" disabled={isSaving}>
                    {isSaving ? "Guardando..." : (mode === 'create' ? "Crear Propiedad" : "Guardar Cambios")}
                </Button>
            </div>
        </form>
    );
} 