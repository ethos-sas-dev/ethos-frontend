import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Mail, AlertTriangle, CheckCircle, Info } from "lucide-react";

interface EmailStatsProps {
  stats: {
    necesitaAtencion: number;
    informativo: number;
    respondido: number;
  };
}

export function EmailStats({ stats }: EmailStatsProps) {
  const total = stats.necesitaAtencion + stats.informativo + stats.respondido;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Correos</CardTitle>
          <Mail className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{total}</div>
          <p className="text-xs text-muted-foreground">
            Total de correos registrados
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Necesitan Atención</CardTitle>
          <AlertTriangle className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{stats.necesitaAtencion}</div>
          <p className="text-xs text-muted-foreground">
            Requieren respuesta urgente
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Informativos</CardTitle>
          <Info className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">{stats.informativo}</div>
          <p className="text-xs text-muted-foreground">
            Solo para información
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Respondidos</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{stats.respondido}</div>
          <p className="text-xs text-muted-foreground">
            Ya fueron gestionados
          </p>
        </CardContent>
      </Card>
    </div>
  );
} 