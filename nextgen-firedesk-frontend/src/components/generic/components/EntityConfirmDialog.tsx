import React from "react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";
import { BaseEntity, EntityConfig } from "../types/entity.types";

interface EntityConfirmDialogProps {
    config: EntityConfig;
    entity: BaseEntity;
    onConfirm: () => void;
    onCancel: () => void;
}

export function EntityConfirmDialog({
    config,
    entity,
    onConfirm,
    onCancel,
}: EntityConfirmDialogProps) {
    return (
        <AlertDialog open={!!entity} onOpenChange={(open) => !open && onCancel()}>
            <AlertDialogContent className="max-w-md">
                <AlertDialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-red-100 rounded-full">
                            <AlertTriangle className="h-5 w-5 text-red-600" />
                        </div>
                        <AlertDialogTitle className="text-xl">
                            Delete {config.entityName}
                        </AlertDialogTitle>
                    </div>
                    <AlertDialogDescription className="text-gray-600 space-y-3">
                        <p>
                            Are you sure you want to delete <strong>{entity.name}</strong>?
                            This action cannot be undone and will permanently remove this record from the system.
                        </p>
                        <div className="p-3 bg-amber-50 rounded-md border border-amber-100 flex gap-2 items-start">
                            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-amber-700">
                                Note: If this {config.entityName.toLowerCase()} is being used as a reference by other records, the deletion may fail to protect data integrity.
                            </p>
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="mt-6">
                    <AlertDialogCancel onClick={onCancel} className="border-gray-300 hover:bg-gray-100">
                        Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onConfirm}
                        className="bg-red-600 hover:bg-red-700 text-white shadow-sm"
                    >
                        Permanently Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

export default EntityConfirmDialog;

