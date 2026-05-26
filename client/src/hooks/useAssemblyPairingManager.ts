import { useState, useRef } from 'react';

interface UseAssemblyPairingManagerReturn {
  isDropdownOpen: boolean;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
  savingPairing: boolean;
  isEditingPartner: boolean;
  savingPartner: boolean;
  setIsDropdownOpen: (open: boolean) => void;
  setSavingPairing: (saving: boolean) => void;
  setIsEditingPartner: (editing: boolean) => void;
  setSavingPartner: (saving: boolean) => void;
  closeDropdown: () => void;
}

export const useAssemblyPairingManager = (): UseAssemblyPairingManagerReturn => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [savingPairing, setSavingPairing] = useState(false);
  const [isEditingPartner, setIsEditingPartner] = useState(false);
  const [savingPartner, setSavingPartner] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const closeDropdown = () => setIsDropdownOpen(false);

  return {
    isDropdownOpen,
    dropdownRef,
    savingPairing,
    isEditingPartner,
    savingPartner,
    setIsDropdownOpen,
    setSavingPairing,
    setIsEditingPartner,
    setSavingPartner,
    closeDropdown,
  };
};
