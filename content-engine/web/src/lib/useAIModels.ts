'use client';

import { useEffect, useState } from 'react';

import { AI_MODELS, Models, type ModelPublic } from './api';

export interface PickerModel {
  id: string;
  label: string;
  isDefault?: boolean;
}

const FALLBACK: PickerModel[] = AI_MODELS.map((m) => ({ id: m.id, label: m.label }));

/**
 * Fetches the platform model registry (public, key-safe) and exposes a
 * picker-friendly list. Falls back to a static list until the fetch resolves
 * or if it fails, so callers always have a valid, non-empty list synchronously.
 */
export function useAIModels(): { models: PickerModel[]; defaultId: string; loading: boolean } {
  const [models, setModels] = useState<PickerModel[]>(FALLBACK);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let alive = true;
    Models.list()
      .then((rows: ModelPublic[]) => {
        if (!alive || !rows?.length) return;
        setModels(
          rows.map((r) => ({ id: r.key, label: r.label, isDefault: r.is_default })),
        );
      })
      .catch(() => {
        /* keep fallback */
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const defaultId = models.find((m) => m.isDefault)?.id ?? models[0]?.id ?? FALLBACK[0].id;
  return { models, defaultId, loading };
}
