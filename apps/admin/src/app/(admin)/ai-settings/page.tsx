'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, RefreshCw } from 'lucide-react';
import { fetchAdminSettings, updateAdminSettings } from '../../../services/api.service';
import { AiConfig } from '../../../types';

const defaultConfig: AiConfig = {
  primaryProvider: 'openai',
  fallbackProvider: 'anthropic',
  primaryModel: 'gpt-4o',
  fallbackModel: 'claude-3-haiku',
  timeout: 30,
  maxRetries: 3,
  temperature: 0.7,
};

export default function AiSettingsPage() {
  const qc = useQueryClient();
  const [config, setConfig] = useState<AiConfig>(defaultConfig);
  const [saved, setSaved] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: fetchAdminSettings,
  });

  useEffect(() => {
    if (data?.aiConfig) {
      setConfig(data.aiConfig);
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: () => updateAdminSettings({ aiConfig: config }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-settings'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  const Field = ({
    label,
    name,
    type = 'text',
    min,
    max,
    step,
  }: {
    label: string;
    name: keyof AiConfig;
    type?: string;
    min?: number;
    max?: number;
    step?: number;
  }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        min={min}
        max={max}
        step={step}
        value={config[name] as string | number}
        onChange={(e) =>
          setConfig((c) => ({
            ...c,
            [name]: type === 'number' ? +e.target.value : e.target.value,
          }))
        }
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3A6C] focus:border-transparent"
      />
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-5">
        <h1 className="text-2xl font-bold text-gray-800">AI Settings</h1>
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
          Loading settings...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">AI Settings</h1>
        <p className="text-gray-500 text-sm mt-1">
          Configure AI provider settings and model preferences
        </p>
      </div>

      {isError && (
        <div className="px-4 py-3 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-lg text-sm">
          Could not load settings from API — showing defaults. Changes will still be submitted.
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
        <h2 className="text-base font-semibold text-gray-700">Provider Configuration</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Primary Provider</label>
            <select
              value={config.primaryProvider}
              onChange={(e) => setConfig((c) => ({ ...c, primaryProvider: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3A6C]"
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="gemini">Google Gemini</option>
              <option value="local">Local (Ollama)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fallback Provider</label>
            <select
              value={config.fallbackProvider}
              onChange={(e) => setConfig((c) => ({ ...c, fallbackProvider: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3A6C]"
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="gemini">Google Gemini</option>
              <option value="local">Local (Ollama)</option>
            </select>
          </div>

          <Field label="Primary Model" name="primaryModel" />
          <Field label="Fallback Model" name="fallbackModel" />
          <Field label="Timeout (seconds)" name="timeout" type="number" min={5} max={300} />
          <Field label="Max Retries" name="maxRetries" type="number" min={0} max={10} />
          <Field
            label="Temperature (0.0 – 1.0)"
            name="temperature"
            type="number"
            min={0}
            max={1}
            step={0.1}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => updateMutation.mutate()}
          disabled={updateMutation.isPending}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#1A3A6C] text-white text-sm font-medium rounded-lg hover:bg-[#15305a] disabled:opacity-50 transition"
        >
          {updateMutation.isPending ? (
            <RefreshCw size={15} className="animate-spin" />
          ) : (
            <Save size={15} />
          )}
          {updateMutation.isPending ? 'Saving...' : 'Save Settings'}
        </button>

        {saved && (
          <span className="text-green-600 text-sm font-medium">
            Settings saved successfully!
          </span>
        )}
      </div>
    </div>
  );
}
