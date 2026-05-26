import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import type { Person } from './usePeople';

import { API_BASE_URL } from '../config';

export interface BoardGeneration {
  id: string;
  name: string;
  startDate: string;
  endDate?: string;
  createdAt: string;
}

export interface BoardMember {
  id: string;
  generationId: string;
  personId: string;
  role: string;
  notes?: string;
  createdAt: string;
}

export interface BoardMemberWithDetails {
  member: BoardMember;
  person: Person;
}

export const useBoardGenerations = () => {
  const [generations, setGenerations] = useState<BoardGeneration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGenerations = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/generations/board`);
      setGenerations(response.data);
      setError(null);
    } catch (err) {
      setError('Error loading board generations');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGenerations();
  }, []);

  const getMembers = useCallback(async (id: string): Promise<BoardMemberWithDetails[]> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/generations/board/${id}/members`);
      return response.data;
    } catch (err) {
      console.error('Error loading board members', err);
      throw err;
    }
  }, []);

  const addGeneration = async (data: Partial<BoardGeneration>) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/generations/board`, data);
      await fetchGenerations();
      return res.data;
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Error';
      throw new Error(errorMsg);
    }
  };

  const updateGeneration = async (id: string, data: Partial<BoardGeneration>) => {
    try {
      const res = await axios.put(`${API_BASE_URL}/generations/board/${id}`, data);
      await fetchGenerations();
      return res.data;
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Error';
      throw new Error(errorMsg);
    }
  };

  const deleteGeneration = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this generation and all its members?')) return;
    try {
      await axios.delete(`${API_BASE_URL}/generations/board/${id}`);
      await fetchGenerations();
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Error';
      throw new Error(errorMsg);
    }
  };

  const addMember = async (generationId: string, data: Partial<BoardMember>) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/generations/board/${generationId}/members`, data);
      return res.data;
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Error';
      throw new Error(errorMsg);
    }
  };

  const updateMember = async (memberId: string, data: Partial<BoardMember>) => {
    try {
      const res = await axios.put(`${API_BASE_URL}/generations/board/members/${memberId}`, data);
      return res.data;
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Error';
      throw new Error(errorMsg);
    }
  };

  const removeMember = async (memberId: string) => {
    if (!window.confirm('Are you sure you want to remove this member from the generation?')) return;
    try {
      await axios.delete(`${API_BASE_URL}/generations/board/members/${memberId}`);
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Error';
      throw new Error(errorMsg);
    }
  };

  return { 
    generations, 
    loading, 
    error, 
    refresh: fetchGenerations, 
    getMembers, 
    addGeneration, 
    updateGeneration, 
    deleteGeneration, 
    addMember, 
    updateMember, 
    removeMember 
  };
};
