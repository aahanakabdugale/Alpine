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
          const fallbackId = data[0].id;
          localStorage.setItem('active_student_id', fallbackId);
          setActiveProfileIdState(fallbackId);
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

  // Initial load without synchronous setState in effect body
  useEffect(() => {
    let cancelled = false;
    apiClient
      .get<StudentSummary[]>('/students')
      .then((response) => {
        if (cancelled) return;
        const data = response.data;
        setProfiles(data);

        const storedId = localStorage.getItem('active_student_id');
        if (data.length > 0) {
          const exists = data.some((p) => p.id === storedId);
          if (storedId && exists) {
            setActiveProfileIdState(storedId);
          } else {
            const fallbackId = data[0].id;
            localStorage.setItem('active_student_id', fallbackId);
            setActiveProfileIdState(fallbackId);
          }
        } else {
          localStorage.removeItem('active_student_id');
          setActiveProfileIdState(null);
        }
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.error('Failed to load student profiles:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch profiles');
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const setActiveProfileId = useCallback((id: string) => {
    localStorage.setItem('active_student_id', id);
    setActiveProfileIdState(id);
    window.dispatchEvent(new CustomEvent('alpine:profile-switch', { detail: id }));
  }, []);

  // Listen to profile switch events
  useEffect(() => {
    const handleSwitch = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail && customEvent.detail !== activeProfileId) {
        setActiveProfileIdState(customEvent.detail);
      }
    };

    window.addEventListener('alpine:profile-switch', handleSwitch);
    return () => {
      window.removeEventListener('alpine:profile-switch', handleSwitch);
    };
  }, [activeProfileId]);

  const activeProfile = useMemo<StudentSummary | null>(() => {
    if (!profiles.length) return null;
    const found = profiles.find((p) => p.id === activeProfileId);
    return found || profiles[0] || null;
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
