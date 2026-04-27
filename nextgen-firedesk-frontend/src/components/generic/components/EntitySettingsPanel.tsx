// src/components/generic/components/EntitySettingsPanel.tsx
// Extracted from GenericEntityPage.tsx - Lines 3188-3248
// Contains EXACT settings panel UI

import React from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { EntityConfig } from "../types/entity.types";

interface EntitySettings {
    itemsPerPage: string;
    defaultView: string;
}

interface EntitySettingsPanelProps {
    config: EntityConfig;
    settings: EntitySettings;
    onSettingsChange: (settings: EntitySettings) => void;
    onSave: () => void;
    onCancel: () => void;
}

export function EntitySettingsPanel({
    config,
    settings,
    onSettingsChange,
    onSave,
    onCancel,
}: EntitySettingsPanelProps) {
    return (
        <Card className="mb-6">
            <CardHeader>
                <CardTitle className="text-lg">Settings</CardTitle>
                <CardDescription>
                    Configure your {config.entityName.toLowerCase()} management
                    preferences
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="itemsPerPage">Items Per Page</Label>
                        <Select
                            value={settings.itemsPerPage}
                            onValueChange={(value) =>
                                onSettingsChange({ ...settings, itemsPerPage: value })
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select items per page" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="5">5</SelectItem>
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="25">25</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="defaultView">Default View</Label>
                        <Select
                            value={settings.defaultView}
                            onValueChange={(value) =>
                                onSettingsChange({ ...settings, defaultView: value })
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select default view" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="table">Table</SelectItem>
                                <SelectItem value="grid">Grid</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                    <Button
                        variant="outline"
                        onClick={onCancel}
                    >
                        Cancel
                    </Button>
                    <Button onClick={onSave}>Save Settings</Button>
                </div>
            </CardContent>
        </Card>
    );
}

export default EntitySettingsPanel;
