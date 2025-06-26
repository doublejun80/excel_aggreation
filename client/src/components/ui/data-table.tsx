import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Column<T> {
  key: keyof T;
  header: string;
  render?: (value: any, row: T) => React.ReactNode;
  align?: "left" | "center" | "right";
  width?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowSelect?: (selectedRows: T[]) => void;
  onRowEdit?: (row: T) => void;
  onRowDelete?: (row: T) => void;
  className?: string;
}

export function DataTable<T extends { id: number }>({
  data,
  columns,
  onRowSelect,
  onRowEdit,
  onRowDelete,
  className,
}: DataTableProps<T>) {
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(data.map(row => row.id));
      setSelectedRows(allIds);
      onRowSelect?.(data);
    } else {
      setSelectedRows(new Set());
      onRowSelect?.([]);
    }
  };

  const handleRowSelect = (rowId: number, checked: boolean) => {
    const newSelected = new Set(selectedRows);
    if (checked) {
      newSelected.add(rowId);
    } else {
      newSelected.delete(rowId);
    }
    setSelectedRows(newSelected);
    
    const selectedData = data.filter(row => newSelected.has(row.id));
    onRowSelect?.(selectedData);
  };

  const isAllSelected = data.length > 0 && selectedRows.size === data.length;
  const isIndeterminate = selectedRows.size > 0 && selectedRows.size < data.length;

  return (
    <div className={cn("w-full", className)}>
      <Table className="data-grid w-full">
        <TableHeader className="bg-gray-100 sticky top-0">
          <TableRow className="border-b border-gray-300">
            {onRowSelect && (
              <TableHead className="w-8">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all"
                />
              </TableHead>
            )}
            {columns.map((column) => (
              <TableHead
                key={String(column.key)}
                className={cn(
                  "font-medium text-black",
                  column.align === "center" && "text-center",
                  column.align === "right" && "text-right"
                )}
                style={{ width: column.width }}
              >
                {column.header}
              </TableHead>
            ))}
            {(onRowEdit || onRowDelete) && (
              <TableHead className="text-center font-medium text-black w-20">
                작업
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow
              key={row.id}
              className={cn(
                "border-b border-gray-200 hover:bg-gray-50",
                selectedRows.has(row.id) && "bg-blue-50"
              )}
            >
              {onRowSelect && (
                <TableCell className="w-8">
                  <Checkbox
                    checked={selectedRows.has(row.id)}
                    onCheckedChange={(checked) => handleRowSelect(row.id, checked as boolean)}
                    aria-label={`Select row ${row.id}`}
                  />
                </TableCell>
              )}
              {columns.map((column) => (
                <TableCell
                  key={String(column.key)}
                  className={cn(
                    "px-4 py-2 text-sm",
                    column.align === "center" && "text-center",
                    column.align === "right" && "text-right"
                  )}
                >
                  {column.render
                    ? column.render(row[column.key], row)
                    : String(row[column.key] || "")}
                </TableCell>
              ))}
              {(onRowEdit || onRowDelete) && (
                <TableCell className="text-center">
                  <div className="flex justify-center space-x-2">
                    {onRowEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRowEdit(row)}
                        className="text-xs text-gray-600 hover:text-black p-0 h-auto"
                      >
                        수정
                      </Button>
                    )}
                    {onRowDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRowDelete(row)}
                        className="text-xs text-red-600 hover:text-red-800 p-0 h-auto"
                      >
                        삭제
                      </Button>
                    )}
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}