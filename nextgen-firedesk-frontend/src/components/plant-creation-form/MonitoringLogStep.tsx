import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function MonitoringLogStep() {
  const activityData = [
    {
      dateTime: "22 Jul 2025, 11:43 AM",
      action: "Updated",
      productCategory: "Hydrant Panel",
      fieldChanged: "Maintenance Frequency",
      previousValue: "Quarterly → Half-Yearly",
      newValue: "",
    },
    {
      dateTime: "08 Jul 2025, 10:12 AM",
      action: "End Date Updated",
      productCategory: "Sprinkler",
      fieldChanged: "End Date",
      previousValue: "31/12/2025 → 31/01/2026",
      newValue: "",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Scheduler Activity Log & History</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Review all recent updates, frequency changes, and setup activity for compliance traceability.
        </p>

        <div className="border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">Date & Time</TableHead>
                <TableHead className="font-semibold">Action</TableHead>
                <TableHead className="font-semibold">Product Category</TableHead>
                <TableHead className="font-semibold">Field Changed</TableHead>
                <TableHead className="font-semibold">Previous → New Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activityData.map((row, index) => (
                <TableRow key={index}>
                  <TableCell className="text-sm">{row.dateTime}</TableCell>
                  <TableCell className="text-sm">{row.action}</TableCell>
                  <TableCell className="text-sm">{row.productCategory}</TableCell>
                  <TableCell className="text-sm">{row.fieldChanged}</TableCell>
                  <TableCell className="text-sm">{row.previousValue}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}