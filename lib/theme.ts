export type ThemePreference = "light" | "dark" | "system";
export const themeStorageKey = "elares-barber-theme";
export function themePreference(value: unknown): ThemePreference {
  return value === "light" || value === "dark" ? value : "system";
}
export function resolvedTheme(
  preference: ThemePreference,
  darkSystem: boolean,
) {
  return preference === "system" ? (darkSystem ? "dark" : "light") : preference;
}
export const themeBootstrap = `(function(){var t='light';var p='system';try{p=localStorage.getItem('${themeStorageKey}');p=p==='light'||p==='dark'?p:'system';}catch(e){}try{t=p==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):p;}catch(e){}document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t;})();`;
