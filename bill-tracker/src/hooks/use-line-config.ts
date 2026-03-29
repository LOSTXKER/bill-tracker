import * as React from "react";
import type { LineNotifySettings } from "@/lib/notifications/settings";

export interface LineConfig {
  channelSecret: string | null;
  channelAccessToken: string | null;
  groupId: string | null;
  notifyEnabled: boolean;
  isConfigured: boolean;
}

interface UseLineConfigOptions {
  /** Also fetch notification settings from /line-config/settings */
  fetchSettings?: boolean;
  /** Skip the initial fetch (useful when only mutations are needed) */
  skipFetch?: boolean;
}

function unwrapResponse(raw: Record<string, unknown>) {
  return (raw.data ?? raw) as Record<string, unknown>;
}

export function useLineConfig(companyId: string, options?: UseLineConfigOptions) {
  const fetchSettings = options?.fetchSettings ?? false;
  const skipFetch = options?.skipFetch ?? false;

  const [config, setConfig] = React.useState<LineConfig | null>(null);
  const [notifySettings, setNotifySettings] = React.useState<LineNotifySettings | null>(null);
  const [loading, setLoading] = React.useState(!skipFetch);

  React.useEffect(() => {
    if (skipFetch) return;

    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      try {
        const promises: Promise<Response>[] = [
          fetch(`/api/companies/${companyId}/line-config`),
        ];
        if (fetchSettings) {
          promises.push(fetch(`/api/companies/${companyId}/line-config/settings`));
        }

        const responses = await Promise.all(promises);
        if (cancelled) return;

        if (responses[0].ok) {
          const raw = await responses[0].json();
          setConfig(unwrapResponse(raw) as unknown as LineConfig);
        }

        if (fetchSettings && responses[1]?.ok) {
          const raw = await responses[1].json();
          const data = unwrapResponse(raw) as { settings?: LineNotifySettings };
          setNotifySettings(data.settings ?? null);
        }
      } catch (error) {
        console.error("Failed to fetch LINE config:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [companyId, fetchSettings, skipFetch]);

  const saveConfig = React.useCallback(
    async (formData: { channelSecret: string; channelAccessToken: string; groupId: string }) => {
      const response = await fetch(`/api/companies/${companyId}/line-config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "เกิดข้อผิดพลาด");
      }

      setConfig((prev) => ({
        channelSecret: prev?.channelSecret ?? null,
        channelAccessToken: prev?.channelAccessToken ?? null,
        isConfigured: true,
        groupId: formData.groupId || null,
        notifyEnabled: prev?.notifyEnabled ?? true,
      }));
    },
    [companyId],
  );

  const removeConfig = React.useCallback(async () => {
    const response = await fetch(`/api/companies/${companyId}/line-config`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error("เกิดข้อผิดพลาด");
    }

    setConfig({
      channelSecret: null,
      channelAccessToken: null,
      groupId: null,
      notifyEnabled: true,
      isConfigured: false,
    });
  }, [companyId]);

  const toggleNotify = React.useCallback(
    async (enabled: boolean) => {
      const response = await fetch(`/api/companies/${companyId}/line-config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notifyEnabled: enabled }),
      });

      if (!response.ok) {
        throw new Error("เกิดข้อผิดพลาด");
      }

      setConfig((prev) => (prev ? { ...prev, notifyEnabled: enabled } : null));
    },
    [companyId],
  );

  const sendTest = React.useCallback(async () => {
    const response = await fetch(`/api/companies/${companyId}/line-config`, {
      method: "PUT",
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "เกิดข้อผิดพลาด");
    }
  }, [companyId]);

  const saveNotifySettings = React.useCallback(
    async (settings: LineNotifySettings) => {
      const response = await fetch(`/api/companies/${companyId}/line-config/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "เกิดข้อผิดพลาด");
      }
    },
    [companyId],
  );

  return {
    config,
    setConfig,
    notifySettings,
    setNotifySettings,
    loading,
    saveConfig,
    removeConfig,
    toggleNotify,
    sendTest,
    saveNotifySettings,
  };
}
