"use client";

import { Skeleton } from "../../../_components/ui/skeleton";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "../../../_components/ui/table";

export const TableSkeleton = ({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) => {
    return (
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
            <Table>
                <TableHeader>
                    <TableRow>
                        {[...Array(columns)].map((_, i) => (
                            <TableHead key={`head-skel-${i}`}><Skeleton className="h-5 w-24" /></TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {[...Array(rows)].map((_, i) => (
                        <TableRow key={`row-skel-${i}`}>
                            {[...Array(columns)].map((_, j) => (
                                <TableCell key={`cell-skel-${i}-${j}`}><Skeleton className="h-5 w-full" /></TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}; 