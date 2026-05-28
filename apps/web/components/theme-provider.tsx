"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

type Props = React.ComponentProps<typeof NextThemesProvider>;

export function ThemeProvider({ children, ...props }: Props): React.JSX.Element {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
