import AppAvatar from '@/components/AppAvatar'
import type { ChatSummary } from '@/features/chat/api'
import { initials } from '@/lib/names'

interface ChatAvatarProps {
  chat: ChatSummary
  size?: number
}

/** A class gets a square with its name, a person a circle with initials */
export function ChatAvatar({ chat, size = 40 }: ChatAvatarProps) {
  if (chat.kind === 'CLASS') {
    return (
      <AppAvatar
        name={chat.title}
        label={chat.title.replace(/^Class /, '')}
        size={size}
        square
      />
    )
  }

  return (
    <AppAvatar
      name={chat.title}
      src={chat.other_user?.avatar_url}
      label={initials(chat.title)}
      size={size}
    />
  )
}
