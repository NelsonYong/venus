"use client";

import { useQuery } from "@tanstack/react-query";
import { httpClient } from "@/lib/http-client";
import { useEffect } from "react";

interface AvailableModel {
  id: string;
  name: string;
  displayName: string;
  provider: string;
  isPreset: boolean;
  contextWindow?: number;
  maxTokens?: number;
}

interface AvailableModelsResponse {
  success: boolean;
  models: AvailableModel[];
}

export function useAvailableModels(onModelChange: (modelId: string) => void) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["available-models"],
    queryFn: async () => {
      const response = await httpClient.get<AvailableModelsResponse>(
        "/api/models/available"
      );
      if (response.status === 200 && response.data?.models) {
        return response.data.models;
      }
      return [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  useEffect(() => {
    if (data && data.length > 0) {
      const savedModelId = localStorage.getItem("selectedModelId");
      const savedModel = savedModelId
        ? data.find((m) => m.id === savedModelId)
        : null;

      let modelToSelect: string;

      if (savedModel) {
        modelToSelect = savedModel.id;
      } else {
        const firstPresetModel = data.find((m) => m.isPreset);
        const defaultModel = firstPresetModel || data[0];
        modelToSelect = defaultModel.id;
        localStorage.setItem("selectedModelId", modelToSelect);
      }

      onModelChange(modelToSelect);
    }
  }, [data, onModelChange]);

  return {
    models: data || [],
    isLoading,
    error,
  };
}
