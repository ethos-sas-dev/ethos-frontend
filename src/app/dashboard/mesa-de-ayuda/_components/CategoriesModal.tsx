"use client";

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/app/_components/ui/dialog';
import { Button } from '@/app/_components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/_components/ui/table';
import { Switch } from '@/app/_components/ui/switch';
import { Input } from '@/app/_components/ui/input';
import { Label } from '@/app/_components/ui/label';
import { Textarea } from '@/app/_components/ui/textarea';
import { Badge } from '@/app/_components/ui/badge';
import { PlusCircle, Edit, Loader2, Save, ArrowLeft } from 'lucide-react';
import { createClient } from '../../../../../lib/supabase/client';
import { Database } from '../../../../../supabase-ethos-types';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/app/_components/ui/tooltip";

type CategoriaTicket = Database['public']['Tables']['categoria_tickets']['Row'];
type UserRole = "Directorio" | "Jefe Operativo" | "Administrador" | "Propietario" | "Arrendatario" | null;

interface CategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  userRole: UserRole;
  onCategoriesChange: () => void;
}

export function CategoriesModal({ isOpen, onClose, userRole, onCategoriesChange }: CategoriesModalProps) {
  const supabase = createClient();
  const [categories, setCategories] = useState<CategoriaTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<Partial<CategoriaTicket> | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const isDirector = userRole === 'Directorio';

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      setEditingCategory(null);
      setError(null);
    }
  }, [isOpen]);

  async function fetchCategories() {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('categoria_tickets')
      .select('*')
      .order('categoria', { ascending: true });

    if (error) {
      setError('No se pudieron cargar las categorías.');
      console.error(error);
    } else {
      setCategories(data);
    }
    setIsLoading(false);
  }

  const handleAddNew = () => {
    setEditingCategory({
      id: -1, // Temporary ID for new category
      categoria: '',
      descripcion: '',
      dias_vencimiento: 7,
      activo: true,
    });
  };

  const handleEdit = (category: CategoriaTicket) => {
    setEditingCategory({ ...category });
  };
  
  const handleCancelEdit = () => {
    setEditingCategory(null);
  };

  const handleSave = async () => {
    if (!editingCategory || !editingCategory.categoria || editingCategory.dias_vencimiento === null) return;

    setIsSaving(true);
    setError(null);

    const categoryData = {
        categoria: editingCategory.categoria,
        descripcion: editingCategory.descripcion,
        dias_vencimiento: editingCategory.dias_vencimiento,
        activo: editingCategory.activo,
    };

    let response;
    if (editingCategory.id === -1) {
        // Crear
        response = await supabase.from('categoria_tickets').insert(categoryData).select();
    } else {
        // Actualizar
        response = await supabase.from('categoria_tickets').update(categoryData).eq('id', editingCategory.id).select();
    }
    
    if (response.error) {
        setError(`Error al guardar: ${response.error.message}`);
        console.error(response.error);
    } else {
        setEditingCategory(null);
        await fetchCategories();
        onCategoriesChange(); // Notificar al padre que las categorías cambiaron
    }

    setIsSaving(false);
  };
  
  const handleToggleActive = async (category: CategoriaTicket) => {
    if (!isDirector) return;
    
    const { error } = await supabase
      .from('categoria_tickets')
      .update({ activo: !category.activo })
      .eq('id', category.id);
      
    if (error) {
      alert(`Error al actualizar estado: ${error.message}`);
    } else {
      await fetchCategories();
      onCategoriesChange();
    }
  };

  const renderTableContent = () => {
    if (isLoading) {
      return (
        <TableRow>
          <TableCell colSpan={5} className="text-center">
            <Loader2 className="h-6 w-6 animate-spin mx-auto my-4" />
            <p>Cargando categorías...</p>
          </TableCell>
        </TableRow>
      );
    }

    if (error) {
        return (
          <TableRow>
            <TableCell colSpan={5} className="text-center text-red-600 py-4">
              {error}
            </TableCell>
          </TableRow>
        );
    }
      
    if (categories.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={5} className="text-center text-gray-500 py-4">
            No se encontraron categorías.
          </TableCell>
        </TableRow>
      );
    }

    return categories.map((cat) => (
      <TableRow key={cat.id}>
        <TableCell className="font-medium">
          {cat.descripcion ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help underline decoration-dotted decoration-gray-400 underline-offset-2">
                  {cat.categoria}
                </span>
              </TooltipTrigger>
              <TooltipContent className="text-sm">
                <p>{cat.descripcion}</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <span>{cat.categoria}</span>
          )}
        </TableCell>
        <TableCell className="text-center">{cat.dias_vencimiento} días</TableCell>
        <TableCell>
            {cat.activo ? 
                <Badge className="bg-green-100 text-green-800">Activo</Badge> : 
                <Badge className="bg-gray-100 text-gray-800">Inactivo</Badge>
            }
        </TableCell>
        {isDirector && (
            <TableCell className="text-right">
                <Button variant="outline" size="sm" className="text-xs" onClick={() => handleEdit(cat)}>
                <Edit className="h-4 w-4 mr-1" />
                Editar
                </Button>
            </TableCell>
        )}
      </TableRow>
    ));
  };

  const renderEditForm = () => {
    if (!editingCategory) return null;

    return (
        <div className="mt-6 p-4 border rounded-lg bg-gray-50 space-y-4">
            <h3 className="text-lg font-semibold">{editingCategory.id === -1 ? 'Nueva Categoría' : 'Editando Categoría'}</h3>
            <div>
                <Label htmlFor="categoria-nombre">Nombre de la Categoría</Label>
                <Input 
                    id="categoria-nombre"
                    value={editingCategory.categoria || ''}
                    onChange={(e) => setEditingCategory({...editingCategory, categoria: e.target.value })}
                />
            </div>
            <div>
                <Label htmlFor="categoria-descripcion">Descripción</Label>
                <Textarea 
                    id="categoria-descripcion"
                    value={editingCategory.descripcion || ''}
                    onChange={(e) => setEditingCategory({...editingCategory, descripcion: e.target.value })}
                />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="dias-vencimiento">Días para Vencimiento</Label>
                    <Input 
                        id="dias-vencimiento"
                        type="number"
                        value={editingCategory.dias_vencimiento || 0}
                        onChange={(e) => setEditingCategory({...editingCategory, dias_vencimiento: parseInt(e.target.value, 10) || 0 })}
                    />
                </div>
                <div>
                    <Label htmlFor="estado-categoria">Estado de la Categoría</Label>
                    <div className="flex items-center space-x-3 h-10">
                        <Switch
                            id="estado-categoria"
                            checked={editingCategory.activo ?? false}
                            onCheckedChange={(checked) => setEditingCategory({...editingCategory, activo: checked})}
                        />
                        <Label htmlFor="estado-categoria" className="text-sm font-normal">
                            {editingCategory.activo ? 'Activo' : 'Inactivo'}
                        </Label>
                    </div>
                </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
                 <Button variant="outline" onClick={handleCancelEdit} className="flex items-center justify-center">
                    <ArrowLeft className="h-4 w-4 mb-0.5" />
                    Cancelar
                </Button>
                <Button onClick={handleSave} disabled={isSaving} className="flex items-center justify-center">
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin mb-0.5" /> : <Save className="h-4 w-4 mb-0.5" />}
                    {editingCategory.id === -1 ? 'Crear Categoría' : 'Guardar Cambios'}
                </Button>
            </div>
        </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <TooltipProvider>
            <DialogHeader>
            <DialogTitle>Categorías de Tickets</DialogTitle>
            <DialogDescription>
                {isDirector 
                    ? 'Aquí puedes ver, editar y/o desactivar las categorías y sus plazos.'
                    : 'Aquí puedes ver las categorías de tickets y sus plazos de vencimiento.'
                }
            </DialogDescription>
            </DialogHeader>

            {isDirector && !editingCategory && (
                <div className="flex justify-end">
                    <Button onClick={handleAddNew} className="flex items-center justify-center">
                        <PlusCircle className="h-4 w-4 mr-0.5 mb-0.5" />
                        Añadir Nueva Categoría
                    </Button>
                </div>
            )}
            
            {editingCategory ? renderEditForm() : (
                <div className="max-h-[60vh] overflow-y-auto">
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Categoría</TableHead>
                            <TableHead className="text-center">Plazo de Vencimiento</TableHead>
                            <TableHead>Estado</TableHead>
                            {isDirector && <TableHead className="text-right">Acciones</TableHead>}
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                            {renderTableContent()}
                        </TableBody>
                    </Table>
                </div>
            )}
        </TooltipProvider>
      </DialogContent>
    </Dialog>
  );
} 