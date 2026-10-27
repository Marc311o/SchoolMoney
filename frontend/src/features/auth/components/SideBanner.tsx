import { Typography, Grid, Box } from '@mui/material'

interface SideBannerProps {
  heroText: string
  descText?: string
}

export default function SideBanner({ heroText, descText }: SideBannerProps) {
  return (
    <Grid
      size={{ sm: 6, md: 4 }}
      sx={{ display: { xs: 'none', sm: 'block' }, height: '1vh' }}
    >
      <Box
        sx={{
          background: (theme) =>
            `linear-gradient(180deg, ${theme.palette.primary.dark} 67%, ${theme.palette.primary.main} 100%)`,
          color: 'primary.contrastText',
          borderRadius: 0,
          height: '100vh',
        }}
      >
        <Grid sx={{ padding: '3em' }}>
          <Box>
            <Typography
              sx={{
                paddingTop: '1em',
                // paddingBottom: '1em',
                fontFamily: 'Bricolage Grotesque, Segoe UI, sans-serif',
                fontSize: { sm: '3vw', md: '2vw' },
                fontWeight: '700',
              }}
            >
              SchoolMoney
            </Typography>
          </Box>
          <Box sx={{ paddingTop: '1em', paddingBottom: '1em' }}>
            <Typography
              sx={{
                margin: 0,
                fontFamily: 'Bricolage Grotesque, Segoe UI, sans-serif',
                fontSize: { sm: '5vw', md: '4vw' },
                lineHeight: { sm: '6vw', md: '5vw' },
                fontWeight: '700',
                letterSpacing: '-0.02em',
                color: '#FFFFFF',
              }}
            >
              {heroText}
            </Typography>
          </Box>
          <Box
            sx={{
              paddingTop: '1em',
              fontWeight: '100',
              fontSize: { sm: '2vw', md: '1.5vw' },
            }}
          >
            {descText}
          </Box>
        </Grid>
      </Box>
    </Grid>
  )
}
