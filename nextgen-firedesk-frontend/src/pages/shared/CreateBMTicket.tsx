// Create BM Ticket Page - Can be used by admin/manager roles
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BMTicketForm } from '@/components/bm-tickets/BMTicketForm';

interface CreateBMTicketPageProps {
  role: 'admin' | 'manager';
}

export function CreateBMTicketPage({ role }: CreateBMTicketPageProps) {
  const navigate = useNavigate();

  const handleSuccess = (ticket: any) => {
    // Navigate to the ticket detail page
    navigate(`/${role}/tickets/bm/${ticket.id}`);
  };

  const handleCancel = () => {
    navigate(-1);
  };

  return (
    <div className="container mx-auto p-6">
      <BMTicketForm
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </div>
  );
}
