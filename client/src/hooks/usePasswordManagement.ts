import { useState } from 'react';
import { changePassword } from './useSettings';

export const usePasswordManagement = () => {
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleChangePassword = async (onSuccess?: () => void) => {
    if (form.newPassword !== form.confirmPassword) {
      setMessage('Passwords do not match');
      return false;
    }

    setSaving(true);
    setMessage(null);
    try {
      await changePassword(form.currentPassword, form.newPassword);
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setMessage('Password updated successfully');
      onSuccess?.();
      return true;
    } catch (error) {
      setMessage('Error updating password');
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    form,
    setForm,
    message,
    setMessage,
    saving,
    handleChangePassword,
  };
};
