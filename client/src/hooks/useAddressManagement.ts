import { useState } from 'react';
import { useAddresses } from './useSettings';

export const useAddressManagement = (isOpen: boolean) => {
  const { addresses, loading, createAddress, updateAddress, deleteAddress } = useAddresses(isOpen);
  const [addressForm, setAddressForm] = useState({ address: '', effectiveFrom: '', notes: '' });
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState({ address: '', effectiveFrom: '', notes: '' });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  return {
    addresses,
    loading,
    addressForm,
    setAddressForm,
    message,
    setMessage,
    saving,
    setSaving,
    editingId,
    setEditingId,
    editingDraft,
    setEditingDraft,
    deletingId,
    setDeletingId,
    createAddress,
    updateAddress,
    deleteAddress,
  };
};
