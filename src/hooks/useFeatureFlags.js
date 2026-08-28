const flag = (name, fallback=false) => {
  const value = import.meta.env[name];
  if (value === undefined) return fallback;
  return String(value).toLowerCase() === 'true';
};

export function useFeatureFlags(){
  return {
    mockData: flag('VITE_USE_MOCK_DATA', true),
    realtime: flag('VITE_ENABLE_REALTIME', false),
    ai: flag('VITE_ENABLE_AI', false),
    satellite: flag('VITE_ENABLE_SATELLITE', false),
    iot: flag('VITE_ENABLE_IOT', false),
  };
}
