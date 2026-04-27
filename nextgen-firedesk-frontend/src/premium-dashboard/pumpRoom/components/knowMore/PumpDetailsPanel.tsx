import { formatDate } from "../../helpers/formatDate";

// -----------------------------------------------------
// TYPE DEFINITIONS
// -----------------------------------------------------

interface ServiceDoneBy {
    name: string;
    [key: string]: any;
}

interface SubmittedForm {
    technicianRemark?: string;
    [key: string]: any;
}

interface LastServiceActivity {
    date: string;
    serviceDoneBy?: ServiceDoneBy;
    submittedFormId?: SubmittedForm;
    [key: string]: any;
}

interface PumpDetailsPanelProps {
    age?: string | number;
    totalOnHours?: string | number;
    lastServiceActivity?: LastServiceActivity;
}

// -----------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------

const PumpDetailsPanel: React.FC<PumpDetailsPanelProps> = ({
    age,
    totalOnHours,
    lastServiceActivity,
}) => {
    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 font-[Figtree] mb-6">
            {/* Header */}
            <div className="mb-3">
                <p className="text-lg md:text-2xl font-medium">Pump Details Panel</p>
            </div>

            {/* Usage Summary Section */}
            <div className="mb-3 bg-[#F9F9F9] rounded-2xl px-3 py-1">
                <p className="text-base md:text-lg font-medium mb-2">Usage Summary</p>

                <div className="flex items-center justify-start gap-x-5 gap-y-3 md:gap-x-10 lg:gap-x-30 xl:gap-x-50 2xl:gap-x-100 flex-wrap">
                    <div className="flex items-center gap-2">
                        <span className="text-sm md:text-lg text-[#727272]">Age:</span>
                        <span className="text-sm md:text-lg text-black font-medium">
                            {age || "---"}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-sm md:text-lg text-[#727272]">
                            Total Run Hours:
                        </span>
                        <span className="text-sm md:text-lg text-black font-medium">
                            {totalOnHours || "---"}
                        </span>
                    </div>
                </div>
            </div>

            {/* Maintenance Info Section */}
            <div className="bg-[#F9F9F9] rounded-2xl px-3 py-1">
                <p className="text-lg font-medium mb-2">Maintenance Info</p>

                <div className="flex items-center justify-start gap-x-5 gap-y-3 md:gap-x-20 lg:gap-x-30 xl:gap-x-50 2xl:gap-x-70 flex-wrap">
                    <div className="flex items-center gap-2 xl:gap-2">
                        <span className="text-sm md:text-lg text-[#727272]">
                            Last Service Activity Date:
                        </span>
                        <span className="text-sm md:text-lg text-black font-medium">
                            {lastServiceActivity?.date ? formatDate(lastServiceActivity.date) : "---"}
                        </span>
                    </div>

                    <div className="flex items-center gap-2 xl:gap-2">
                        <span className="text-sm md:text-lg text-[#727272]">
                            Assigned Technician:
                        </span>
                        <span className="text-sm md:text-lg text-black font-medium">
                            {lastServiceActivity?.serviceDoneBy?.name || "---"}
                        </span>
                    </div>

                    <div className="flex items-center gap-2 xl:gap-2">
                        <span className="text-sm md:text-lg text-[#727272]">
                            Technician Remark:
                        </span>
                        <span className="text-sm md:text-lg text-black font-medium">
                            {lastServiceActivity?.submittedFormId?.technicianRemark || "---"}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PumpDetailsPanel;