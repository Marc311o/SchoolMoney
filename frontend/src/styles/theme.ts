import { createTheme } from '@mui/material/styles'

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

    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
    },

    h2: {
      fontSize: '2rem',
      fontWeight: 600,
    },

    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
    },

    button: {
      textTransform: 'none',
      fontWeight: 600,
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
