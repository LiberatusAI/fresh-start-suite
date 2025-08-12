// Adapter to convert custom chart themes to shadcn/ui format

export function adaptChartConfig(customConfig: any) {
  const adapted: any = {};
  
  for (const [key, value] of Object.entries(customConfig)) {
    if (value && typeof value === 'object' && 'theme' in value) {
      // Convert custom theme format to shadcn format
      if (value.theme.base) {
        adapted[key] = {
          ...value,
          theme: {
            light: value.theme.base,
            dark: value.theme.gradient?.to || value.theme.base
          }
        };
      } else {
        adapted[key] = value;
      }
    } else {
      adapted[key] = value;
    }
  }
  
  return adapted;
}