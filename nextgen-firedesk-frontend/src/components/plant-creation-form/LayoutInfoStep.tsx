import { Info, Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface LayoutInfoStepProps {
  formData: any;
}

export function LayoutInfoStep({ formData }: LayoutInfoStepProps) {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Floor Layout Files</h2>
        <p className="text-muted-foreground">
          Layout files can now be uploaded directly from the Floorplan Management page after plant creation.
        </p>
      </div>

      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <Info className="text-blue-600 h-8 w-8" />
          </div>
          <div className="flex-1 space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                Upload Layouts After Plant Creation
              </h3>
              <p className="text-sm text-blue-800 leading-relaxed">
                To streamline the plant creation process, floor layouts are now managed separately.
                After creating your plant, you can upload layout files for individual floors from the
                <strong> Floorplan Management</strong> page.
              </p>
            </div>

            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Benefits of the new workflow:</h4>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold mt-0.5">•</span>
                  <span><strong>Simplified Creation:</strong> Complete plant setup faster without layout files</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold mt-0.5">•</span>
                  <span><strong>Better Organization:</strong> Upload and manage layouts per floor with proper associations</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold mt-0.5">•</span>
                  <span><strong>Easy Updates:</strong> Replace or update floor layouts anytime from the dashboard</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold mt-0.5">•</span>
                  <span><strong>Drag & Drop:</strong> Modern file upload interface with preview and validation</span>
                </li>
              </ul>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-amber-900 mb-2">How to upload layouts:</h4>
              <ol className="space-y-2 text-sm text-amber-800 list-decimal list-inside">
                <li>Complete plant creation (all steps including this one)</li>
                <li>Navigate to <strong>Floorplan Management</strong> from the sidebar</li>
                <li>Select your plant and building from the dropdowns</li>
                <li>Click <strong>"Add Floorplan"</strong> button for any floor</li>
                <li>Upload your SVG or PNG layout file with drag-and-drop</li>
              </ol>
            </div>

            <div className="flex items-center gap-3 pt-2">
              {/* <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/admin/floorplans')}
                className="text-blue-600 border-blue-600 hover:bg-blue-50"
              >
                <Map className="h-4 w-4 mr-2" />
                Go to Floorplan Management
              </Button> */}
              <span className="text-xs text-gray-500">
                (Opens in new context - your plant data will be saved)
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-sm text-gray-700">
          <strong>Note:</strong> You can continue to the next step without uploading layouts.
          Layout files are optional and can be added later at any time.
        </p>
      </div>
    </div>
  );
}
