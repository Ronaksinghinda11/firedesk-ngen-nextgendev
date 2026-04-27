import { format } from "date-fns";

export const formatDate = (dateString: string | Date | null | undefined): string => {
    if (!dateString) {
        return "";
    }

    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        return "";
    }

    return format(date, "dd-MM-yyyy");
};