import { createTheme } from '@mui/material/styles'

export const DISPLAY_FONT = 'Bricolage Grotesque, Segoe UI, sans-serif'

export const theme = createTheme({
  cssVariables: {
    colorSchemeSelector: 'class',
  },

  colorSchemes: {
    light: {
      palette: {
        mode: 'light',

        primary: {
          main: '#1E6A4C',
          light: '#9FE0B8',
          dark: '#153326',
          contrastText: '#FFFFFF',
        },

        secondary: {
          main: '#BA9956',
          contrastText: '#1E2220',
        },

        error: {
          main: '#ED5356',
          light: '#FBE3DA',
          dark: '#610E0E',
        },

        background: {
          default: '#F6F5F0',
          paper: '#FFFFFF',
        },

        text: {
          primary: '#1E2220',
          secondary: '#6C726E',
        },

        divider: '#EAE7E1',

        success: {
          main: '#1E6A4C',
          light: '#9FE0B8',
          dark: '#153326',
          contrastText: '#FFFFFF',
        },

        warning: {
          main: '#BA9956',
          light: '#F8E8D5',
        },
      },
    },

    dark: {
      palette: {
        mode: 'dark',

        primary: {
          main: '#9FE0B8',
          light: '#C5F0D4',
          dark: '#1E6A4C',
          contrastText: '#14261E',
        },

        secondary: {
          main: '#BA9956',
          contrastText: '#14261E',
        },

        error: {
          main: '#ED5356',
          dark: '#610E0E',
        },

        background: {
          default: '#14261E',
          paper: '#1B3026',
        },

        text: {
          primary: '#F6F5F0',
          secondary: '#B8C2BB',
        },

        divider: '#34483D',

        success: {
          main: '#9FE0B8',
          dark: '#1E6A4C',
          contrastText: '#14261E',
        },

        warning: {
          main: '#BA9956',
          light: '#F8E8D5',
        },
      },
    },
  },

  typography: {
    fontFamily: 'Arial, sans-serif',

    fontWeightLight: 300,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 700,

    h1: {
      fontFamily: DISPLAY_FONT,
      fontSize: '1.75rem',
      lineHeight: 1.2,
      fontWeight: 700,
      '@media (min-width:900px)': { fontSize: '2.25rem' },
    },

    h2: {
      fontFamily: DISPLAY_FONT,
      fontSize: '1.375rem',
      lineHeight: 1.3,
      fontWeight: 700,
    },

    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
      fontWeight: 400,
    },

    button: {
      textTransform: 'none',
      fontWeight: 500,
    },
  },

  shape: {
    borderRadius: 12,
  },

  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 10,
        },
      },
    },

    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          boxShadow: 'none',
          border: '1px solid var(--mui-palette-divider)',
        },
      },
    },
  },
})
