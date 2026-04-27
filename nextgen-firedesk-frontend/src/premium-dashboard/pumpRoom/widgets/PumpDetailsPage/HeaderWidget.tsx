import { MenuItem, Select, SelectChangeEvent } from "@mui/material";
import { Activity, Play, Wrench } from "lucide-react";
import Card3D from "@/premium-dashboard/components/Card3D";
import { useKnowMore } from "../../contexts/KnowMoreContext";
import { cn } from "@/lib/utils";

const HeaderWidget: React.FC = () => {
    const { assets, selectedAsset, selectedAssetData, setSelectedAsset, pumpIotData, PS, AS } = useKnowMore();

    const handleAssetChange = (event: SelectChangeEvent<string>) => {
        setSelectedAsset(event.target.value);
    };

    const condition = pumpIotData[PS] === 0 ? "ON" : pumpIotData[PS] === 1 ? "OFF" : "-";
    const mode = pumpIotData[AS] === 1 ? "Auto" : pumpIotData[AS] === 0 ? "Manual" : "-";

    return (
        <Card3D className="p-3 shadow-lg border-t-2 border-t-primary border-x border-b border-border/40">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                {/* Left Section - Machine Info */}
                <div className="flex items-center gap-3">
                    {/* Machine Icon */}
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center border border-primary/20">
                        <Activity className="w-7 h-7 text-primary" strokeWidth={2} />
                    </div>

                    {/* Machine Details */}
                    <div className="flex flex-col gap-1.5">
                        {/* Machine Name with Dropdown */}
                        <div className="border border-border/40 px-2 py-1 rounded-lg bg-card hover:border-primary/30 transition-all">
                            <Select
                                value={selectedAsset}
                                variant="standard"
                                onChange={handleAssetChange}
                                displayEmpty
                                sx={{
                                    width: 180,
                                    "&:before, &:after": { display: "none" },
                                    "& .MuiSelect-select": {
                                        backgroundColor: "transparent",
                                        padding: 0,
                                        fontSize: "0.8rem",
                                        fontWeight: 700,
                                    },
                                }}
                            >
                                <MenuItem value="" disabled>
                                    Select pump
                                </MenuItem>
                                {assets.map((asset) => (
                                    <MenuItem value={asset.id} key={asset.id}>
                                        {asset.asset_code}
                                    </MenuItem>
                                ))}
                            </Select>
                        </div>

                        {/* Machine ID and Location */}
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            <span className="font-semibold bg-muted/50 px-1.5 py-0.5 rounded">{selectedAssetData?.asset_code}</span>
                            <span className="border-l border-border/50 pl-1.5 font-medium">
                                {selectedAssetData?.building} - {selectedAssetData?.location}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Right Section - Status & Mode */}
                <div className="flex items-center gap-3">
                    {/* Status */}
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase">Condition</span>
                        <div
                            className={cn(
                                "px-2 py-1 rounded-lg text-xs font-bold border",
                                condition === "ON"
                                    ? "bg-primary/10 border-primary/30 text-primary"
                                    : condition === "OFF"
                                        ? "bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400"
                                        : "bg-muted/50 border-border/50 text-muted-foreground"
                            )}
                        >
                            {condition}
                        </div>
                    </div>

                    {/* Mode */}
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase">Mode</span>
                        <div className="flex items-center gap-1.5 bg-primary/5 px-2 py-1 rounded-lg border border-primary/20">
                            {mode === "Auto" ? (
                                <Play className="w-3 h-3 text-primary" strokeWidth={2.5} />
                            ) : mode === "Manual" ? (
                                <Wrench className="w-3 h-3 text-muted-foreground" strokeWidth={2.5} />
                            ) : null}
                            <span className="text-xs font-bold text-foreground">{mode}</span>
                        </div>
                    </div>
                </div>
            </div>
        </Card3D>
    );
};

export default HeaderWidget;
