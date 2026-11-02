import { type Child, useChildren, useJoinClass } from '@/features/children/api'
import { useState } from 'react'

import { Box, CircularProgress, Typography, Stack } from '@mui/material'
import { useNavigate } from 'react-router'

import AppButton from '@/components/AppButton'
import AppButtonOutlined from '@/components/AppButtonOutlined'
import EmptyState from '@/components/EmptyState'
import PageHeader from '@/components/PageHeader'
import {
  type SchoolClassCreate,
  useClasses,
  useCreateClass,
} from '@/features/classes/api'
import { ClassCard } from '@/features/classes/components/ClassCard'
import SelectChildToJoinDialog from '@/features/classes/components/SelectChildToJoinDialog.tsx'
import JoinClassDialog from '@/features/children/components/JoinClassDialog.tsx'
import NoAvailableChildrenDialog from '@/features/classes/components/NoAvailableChildrenDialog'
import CreateClassDialog from '@/features/classes/components/CreateClassDialog'

export function ClassesPage() {
  const { data: classes = [], isPending, isError } = useClasses()
  const navigate = useNavigate()

  const { data: children = [] } = useChildren()

  const joinClass = useJoinClass()

  const [isSelectChildOpen, setIsSelectChildOpen] = useState(false)
  const [childToJoin, setChildToJoin] = useState<Child | null>(null)

    const [isCreateClassOpen, setIsCreateClassOpen] = useState(false)
    const createClass = useCreateClass()

  // Children who do not belong to any class
  const availableChildren = children.filter(
    (child) => child.school_class === null,
  )

  const [isNoChildrenOpen, setIsNoChildrenOpen] = useState(false)

  const handleOpenJoin = () => {
    if (availableChildren.length === 0) {
      setIsNoChildrenOpen(true)
      return
    }

    setIsSelectChildOpen(true)
  }

  const handleCloseSelectChild = () => {
    setIsSelectChildOpen(false)
  }

  const handleSelectChild = (child: Child) => {
    setIsSelectChildOpen(false)

    joinClass.reset()
    setChildToJoin(child)
  }

  const handleCloseJoin = () => {
    if (joinClass.isPending) return

    setChildToJoin(null)
    joinClass.reset()
  }

  const handleConfirmJoin = (code: string) => {
    if (!childToJoin) return

    joinClass.mutate(
      {
        child_id: childToJoin.id,
        code,
      },
      {
        onSuccess: () => {
          setChildToJoin(null)
          joinClass.reset()
        },
      },
    )
  }

  const handleGoToChildren = () => {
    setIsNoChildrenOpen(false)
    navigate('/children')
  }

  const handleCreateClass = (payload: SchoolClassCreate) => {
      createClass.mutate(payload, {
        onSuccess: () => {
          setIsCreateClassOpen(false)
          createClass.reset()
        },
      })
    }

  return (
    <Stack spacing={4} sx={{ p: '1em' }}>
      <PageHeader
        title="Classes"
        subtitle="Classes your children are in, and the ones you run as treasurer."
        actions={
          classes.length > 0 && (
            <>
              <AppButtonOutlined
                label="Join with a code"
                onClick={handleOpenJoin}
              />
              <AppButton
                label="New class"
                onClick={() => {
                  createClass.reset()
                  setIsCreateClassOpen(true)
                }}
              />
            </>
          )
        }
      />

      {isPending ? (
        <CircularProgress sx={{ alignSelf: 'center' }} />
      ) : isError ? (
        <Typography color="error">Could not load your classes.</Typography>
      ) : classes.length === 0 ? (
        <EmptyState
          dashed
          title="You're not in any class yet"
          description="Ask your class treasurer for the access code, then join from your child's card."
          actions={
            <>
              <AppButtonOutlined
                label="Go to My children"
                onClick={() => navigate('/children')}
              />

              <AppButton
                label="Create new class"
                onClick={() => {
                  createClass.reset()
                  setIsCreateClassOpen(true)
                }}
              />
            </>
          }
        />
      ) : (
        <Box
          sx={{
            display: 'grid',
            gap: 2.5,
            gridTemplateColumns:
              'repeat(auto-fill, minmax(min(300px, 100%), 1fr))',
          }}
        >
          {classes.map((schoolClass) => (
            <ClassCard key={schoolClass.id} schoolClass={schoolClass} />
          ))}
        </Box>
      )}

      {/* SELECT CHILD */}
      <SelectChildToJoinDialog
        open={isSelectChildOpen}
        availableChildren={availableChildren}
        onClose={handleCloseSelectChild}
        onConfirm={handleSelectChild}
      />

      {/* JOIN CLASS */}
      <JoinClassDialog
        open={!!childToJoin}
        childName={
          childToJoin
            ? `${childToJoin.first_name} ${childToJoin.last_name}`
            : ''
        }
        onClose={handleCloseJoin}
        onConfirm={handleConfirmJoin}
        loading={joinClass.isPending}
        error={joinClass.error}
      />

      {/* NO AVAILABLE CHILDREN */}
      <NoAvailableChildrenDialog
        open={isNoChildrenOpen}
        onClose={() => setIsNoChildrenOpen(false)}
        onGoToChildren={handleGoToChildren}
      />

      {/* CREATE CLASS DIALOG */}
      <CreateClassDialog
        open={isCreateClassOpen}
        onClose={() => setIsCreateClassOpen(false)}
        onConfirm={handleCreateClass}
        loading={createClass.isPending}
        error={createClass.error}
      />
    </Stack>
  )
}
