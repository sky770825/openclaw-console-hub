import { useEffect, useState } from 'react';
import { getFeatures, type FeatureFlags } from '@/services/features';

const DEFAULTS: FeatureFlags = {
  'page.cursor': true,
  'page.projects': true,
  'page.review': true,
  'page.alerts': true,
  'page.logs': true,
  'page.runs': true,
  'page.settings': true,
  'task.bulkOps': true,
  'ops.emergencyStop': true,
  'ops.incidentCreate': false,
};

export function useFeatures() {
  const [features, setFeatures] = useState<FeatureFlags>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await getFeatures();
        if (!mounted) return;
        if (res?.ok && res.features) {
          setFeatures({ ...DEFAULTS, ...res.features });
        }
        // 失敗時保留 DEFAULTS，不覆蓋
      } finally {
        if (mounted) setLoaded(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return { features, loaded };
}

