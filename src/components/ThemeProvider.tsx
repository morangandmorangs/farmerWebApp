import type { ReactNode } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

/** Where the farmer's choice is kept. index.html reads it too, to paint the right theme first. */
export const THEME_STORAGE_KEY = "lm-farmer-theme";

/**
 * Light, dark or the device's setting ("system", the default), remembered in
 * this browser. It puts the `dark` class on <html>, which the `.dark` colours
 * in index.css and Tailwind's `dark:` variants follow, and sets color-scheme
 * so native controls (date pickers, selects) match. Read it with
 * `useTheme()` from next-themes.
 */
export default function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey={THEME_STORAGE_KEY}
      disableTransitionOnChange
      // next-themes renders an inline script meant for server rendering.
      // This app renders in the browser, where index.html's script paints the
      // saved theme first, so the inline one is made inert (a data block),
      // which also stops React warning about a script tag.
      scriptProps={{ type: "application/json" }}
    >
      {children}
    </NextThemesProvider>
  );
}
