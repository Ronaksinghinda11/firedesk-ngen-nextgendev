import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import ServiceFormView from "@/components/ServiceForms/FormView/ServiceFormView";
import adminServiceFormApi from "@/services/api/adminServiceFormApi";

export const ServiceFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  if (!id) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-600">Invalid form ID</p>
      </div>
    );
  }

  const handleError = async (error: any) => {
    // If the form is not found (404), check if it's a service submission ID
    if (error.response?.status === 404) {
      try {
        // Try to fetch as a service submission
        await adminServiceFormApi.getServiceSubmissionView(id);
        // If successful, redirect to the service submission view
        navigate(`/admin/service-submissions/${id}`, { replace: true });
      } catch (submissionError) {
        // If it's not a submission either, do nothing (let the error message show)
        console.error("Failed to resolve ID as form or submission", submissionError);
      }
    }
  };

  return <ServiceFormView formId={id} onError={handleError} />;
};
