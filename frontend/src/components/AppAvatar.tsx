import { Avatar } from '@mui/material'

const COLORS = [
  { bg: '#F6D9B8', fg: '#6B3A0A' },
  { bg: '#CFE3F5', fg: '#163E63' },
  { bg: '#E9DCF5', fg: '#4B2A6B' },
  { bg: '#DCEBD3', fg: '#2C4A1A' },
  { bg: '#F8DCD3', fg: '#6E2614' },
  { bg: '#D5EEEA', fg: '#134A42' },
] as const

/** The same name always gets the same color */
function colorFor(name: string) {
  let hash = 0
  for (const char of name) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  }
  return COLORS[hash % COLORS.length]
}

interface AppAvatarProps {
  name: string
  src?: string | null
  size?: number
  randomColor?: boolean
  label?: string
  square?: boolean
}

export default function AppAvatar({
  name,
  src,
  size = 56,
  randomColor = true,
  label,
  square = false,
}: AppAvatarProps) {
  const color = randomColor ? colorFor(name) : { bg: '#E9DCF5', fg: '#4B2A6B' }
  const text = label ?? name.trim().charAt(0).toUpperCase()

  return (
    <Avatar
      src={src ?? undefined}
      alt={name}
      variant={square ? 'rounded' : 'circular'}
      sx={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: square ? '12px' : '50%',
        bgcolor: color.bg,
        color: color.fg,
        fontFamily: 'Bricolage Grotesque, Segoe UI, sans-serif',
        fontSize: size * (text.length > 1 ? 0.36 : 0.4),
        fontWeight: 700,
      }}
    >
      {text}
    </Avatar>
  )
}
