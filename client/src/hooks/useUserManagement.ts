import { useState } from 'react';
import { useSettingsUsers } from './useSettings';
import { getPermissionsForRole, type Permission } from '../lib/permissions';

export const useUserManagement = (canViewUsers: boolean) => {
  const { users, loading, error, createUser, updateUser, deleteUser } = useSettingsUsers(canViewUsers);

  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    role: 'viewer',
    permissions: getPermissionsForRole('viewer') as Permission[],
  });
  const [savingUser, setSavingUser] = useState(false);
  const [userMessage, setUserMessage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; email: string } | null>(null);
  const [deleteConfirmValue, setDeleteConfirmValue] = useState('');
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  return {
    users,
    loading,
    error,
    newUser,
    setNewUser,
    savingUser,
    setSavingUser,
    userMessage,
    setUserMessage,
    editingId,
    setEditingId,
    showAddUserModal,
    setShowAddUserModal,
    deleteTarget,
    setDeleteTarget,
    deleteConfirmValue,
    setDeleteConfirmValue,
    isDeletingUser,
    setIsDeletingUser,
    deleteMessage,
    setDeleteMessage,
    resetMessage,
    setResetMessage,
    createUser,
    updateUser,
    deleteUser,
  };
};
