import type { ReactNode } from 'react'
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'

import { theme } from './theme'

type Props = {
  children: ReactNode
}

export default function ThemeProvider({ children }: Props) {
  return (
    <MuiThemeProvider
      theme={theme}
      defaultMode="light"
      modeStorageKey="app-color-mode"
    >
      <CssBaseline enableColorScheme />
      {children}
    </MuiThemeProvider>
  )
}
