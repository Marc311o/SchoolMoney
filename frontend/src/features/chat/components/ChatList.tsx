import { useState } from 'react'
import { Box, CircularProgress, Stack, Typography } from '@mui/material'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'

import AppButton from '@/components/AppButton'
import AppButtonOutlined from '@/components/AppButtonOutlined'
import SelectChips from '@/components/SelectChips'
import TextInput from '@/components/TextInput'
import WhiteCard from '@/components/WhiteCard'
import {
  type ChatSummary,
  type ChatTab,
  filterChats,
} from '@/features/chat/api'
import { ChatListItem } from '@/features/chat/components/ChatListItem'

const TAB_LABELS: Record<ChatTab, string> = {
  ALL: 'All',
  CLASS: 'Classes',
  DIRECT: 'Direct',
  ADMIN: 'Admin',
}

interface ChatListProps {
  chats: ChatSummary[]
  isPending: boolean
  isError: boolean
  myId: string
  selectedId: string | undefined
  tabs: ChatTab[]
  searchPlaceholder?: string
  newMessageLabel?: string
  onOpen: (chatId: string) => void
  onNewMessage: () => void
  onMessageAdmin?: () => void
  messageAdminPending?: boolean
}

/** Left column: tabs, search, conversations and "New message" */
export function ChatList({
  chats,
  isPending,
  isError,
  myId,
  selectedId,
  tabs,
  searchPlaceholder = 'Search class or parent',
  newMessageLabel = 'New message',
  onOpen,
  onNewMessage,
  onMessageAdmin,
  messageAdminPending = false,
}: ChatListProps) {
  const [tab, setTab] = useState<ChatTab>('ALL')
  const [search, setSearch] = useState('')

  const visible = filterChats(chats, tab, search)
  const tabOptions = tabs.map((value) => ({
    value,
    label: TAB_LABELS[value],
  }))
  const canStartAdminChat =
    onMessageAdmin !== undefined &&
    tab === 'ADMIN' &&
    !chats.some((chat) => chat.kind === 'ADMIN')

  return (
    <WhiteCard
      padding={0}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <Stack
        spacing={1.5}
        sx={{ p: 2, pb: 1.5, borderBottom: 1, borderColor: 'divider' }}
      >
        {tabOptions.length > 1 && (
          <SelectChips
            label="Filter conversations"
            options={tabOptions}
            value={tab}
            onChange={setTab}
          />
        )}
        <TextInput
          value={search}
          onChange={setSearch}
          placeholder={searchPlaceholder}
          ariaLabel="Search conversations"
          icon={<SearchRoundedIcon fontSize="small" />}
        />
      </Stack>

      <Box sx={{ flex: 1, overflowY: 'auto', p: 1 }}>
        {isPending ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress size={28} />
          </Box>
        ) : isError ? (
          <Message>Could not load your conversations.</Message>
        ) : canStartAdminChat ? (
          <Stack spacing={1.5} sx={{ p: 1.5, alignItems: 'flex-start' }}>
            <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
              Questions about SchoolMoney? Write to the administrator.
            </Typography>
            <AppButton
              label="Message the administrator"
              onClick={onMessageAdmin}
              loading={messageAdminPending}
            />
          </Stack>
        ) : visible.length === 0 ? (
          <Message>
            {search.trim()
              ? 'No conversations match your search.'
              : 'No conversations here yet.'}
          </Message>
        ) : (
          <Stack spacing={0.25}>
            {visible.map((chat) => (
              <ChatListItem
                key={chat.id}
                chat={chat}
                myId={myId}
                selected={chat.id === selectedId}
                onClick={() => onOpen(chat.id)}
              />
            ))}
          </Stack>
        )}
      </Box>

      <Box sx={{ p: 2, pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
        <AppButtonOutlined
          label={newMessageLabel}
          onClick={onNewMessage}
          fullWidth
        />
      </Box>
    </WhiteCard>
  )
}

function Message({ children }: { children: string }) {
  return (
    <Typography sx={{ m: 1.5, fontSize: 14, color: 'text.secondary' }}>
      {children}
    </Typography>
  )
}
