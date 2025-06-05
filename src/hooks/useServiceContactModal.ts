'use client';

import { useState, useCallback } from 'react';

export interface ServiceContactModalData {
  serviceName: string;
  serviceType: string;
  pageUrl: string;
  formType: string;
  source: string;
}

export interface UseServiceContactModalReturn {
  isOpen: boolean;
  serviceData: ServiceContactModalData | null;
  openModal: (data: ServiceContactModalData) => void;
  closeModal: () => void;
}

export const useServiceContactModal = (): UseServiceContactModalReturn => {
  const [isOpen, setIsOpen] = useState(false);
  const [serviceData, setServiceData] = useState<ServiceContactModalData | null>(null);

  const openModal = useCallback((data: ServiceContactModalData) => {
    setServiceData(data);
    setIsOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    setServiceData(null);
  }, []);

  return {
    isOpen,
    serviceData,
    openModal,
    closeModal,
  };
};
