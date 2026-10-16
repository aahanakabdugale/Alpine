import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '@/lib/api';
import type { StudentSummary } from '@/types';

export function useStudentProfiles() {
  const [profiles, setProfiles] = useState<StudentSummary[]>([]);
  const [activeProfileId, setActiveProfileIdState] = useState<string | null>(() => {
    return localStorage.getItem('active_student_id');
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<StudentSummary[]>('/students');
      const data = response.data;
      setProfiles(data);

      const storedId = localStorage.getItem('active_student_id');
      if (data.length > 0) {
        const exists = data.some((p) => p.id === storedId);
        if (storedId && exists) {
          setActiveProfileIdState(storedId);
        } else {
          // If stored ID is invalid or not yet set, do not force-select demo-alex
          if (storedId && !exists) {
            localStorage.removeItem('active_student_id');
          }
          setActiveProfileIdState(null);
        }
      } else {
        localStorage.removeItem('active_student_id');
        setActiveProfileIdState(null);
      }
    } catch (err: unknown) {
      console.error('Failed to load student profiles:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch profiles');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const setActiveProfileId = useCallback((id: string | null) => {
    if (id) {
      localStorage.setItem('active_student_id', id);
      setActiveProfileIdState(id);
      window.dispatchEvent(new CustomEvent('alpine:profile-switch', { detail: id }));
    } else {
      localStorage.removeItem('active_student_id');
      setActiveProfileIdState(null);
      window.dispatchEvent(new CustomEvent('alpine:profile-switch', { detail: '__CLEAR_PROFILE__' }));
    }
  }, []);

  // Listen to profile switch events and reload profile list
  useEffect(() => {
    const handleSwitch = (e: Event) => {
      const customEvent = e as CustomEvent<string | null>;
      const detail = customEvent.detail;
      if (typeof detail === 'string') {
        if (detail === '__CLEAR_PROFILE__') {
          setActiveProfileIdState(null);
          localStorage.removeItem('active_student_id');
        } else if (detail.length > 0) {
          setActiveProfileIdState(detail);
          localStorage.setItem('active_student_id', detail);
        }
      }
      fetchProfiles();
    };

    const handleReload = () => {
      fetchProfiles();
    };

    window.addEventListener('alpine:profile-switch', handleSwitch);
    window.addEventListener('alpine:dev-time-travel', handleReload);
    window.addEventListener('alpine:schedule-updated', handleReload);
    return () => {
      window.removeEventListener('alpine:profile-switch', handleSwitch);
      window.removeEventListener('alpine:dev-time-travel', handleReload);
      window.removeEventListener('alpine:schedule-updated', handleReload);
    };
  }, [fetchProfiles]);

  const activeProfile = useMemo<StudentSummary | null>(() => {
    if (!profiles.length || !activeProfileId) return null;
    return profiles.find((p) => p.id === activeProfileId) || null;
  }, [profiles, activeProfileId]);

  return {
    profiles,
    activeProfile,
    activeProfileId,
    setActiveProfileId,
    loading,
    error,
    refreshProfiles: fetchProfiles,
  };
}
