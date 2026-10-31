import { useState } from 'react'
import { Box, CircularProgress, Stack, Typography } from '@mui/material'

import AppButton from '@/components/AppButton'
import WhiteCard from '@/components/WhiteCard'

import {
  type Child,
  type ChildCreate,
  type ChildUpdate,
  useChildren,
  useCreateChild,
  useRemoveChild,
  useUpdateChild,
} from '@/features/children/api'

import { ChildCard } from '@/features/children/components/ChildCard'
import RemoveChildDialog from '@/features/children/components/RemoveChildDialog'
import AddChildDialog from '@/features/children/components/AddChildDialog'
import EditChildDialog from '@/features/children/components/EditChildDialog'

export function ChildrenPage() {
  const { data: children = [], isPending, isError } = useChildren()

  const createChild = useCreateChild()
  const updateChild = useUpdateChild()
  const removeChild = useRemoveChild()

  const [isAddOpen, setIsAddOpen] = useState(false)
  const [childToRemove, setChildToRemove] = useState<Child | null>(null)
  const [childToEdit, setChildToEdit] = useState<Child | null>(null)

  // ADD
  const handleAdd = () => {
    createChild.reset()
    setIsAddOpen(true)
  }

  const handleCloseAdd = () => {
    if (createChild.isPending) return

    setIsAddOpen(false)
    createChild.reset()
  }

  const handleConfirmAdd = (child: ChildCreate) => {
    createChild.mutate(child, {
      onSuccess: () => {
        setIsAddOpen(false)
        createChild.reset()
      },
    })
  }

  // EDIT
  const handleEdit = (child: Child) => {
    updateChild.reset()
    setChildToEdit(child)
  }

  const handleCloseEdit = () => {
    if (updateChild.isPending) return

    setChildToEdit(null)
    updateChild.reset()
  }

  const handleConfirmEdit = (data: ChildUpdate) => {
    if (!childToEdit) return

    updateChild.mutate(
      {
        id: childToEdit.id,
        data,
      },
      {
        onSuccess: () => {
          setChildToEdit(null)
          updateChild.reset()
        },
      },
    )
  }

  // REMOVE
  const handleRemove = (child: Child) => {
    removeChild.reset()
    setChildToRemove(child)
  }

  const handleCloseRemove = () => {
    if (removeChild.isPending) return

    setChildToRemove(null)
    removeChild.reset()
  }

  const handleConfirmRemove = () => {
    if (!childToRemove) return

    removeChild.mutate(childToRemove.id, {
      onSuccess: () => {
        setChildToRemove(null)
        removeChild.reset()
      },
    })
  }

  return (
    <>
      <Stack spacing={4} sx={{ p: '1em' }}>
        <Stack
          direction="row"
          sx={{
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <Box>
            <Typography
              component="h1"
              sx={{
                fontFamily: 'Bricolage Grotesque, Segoe UI, sans-serif',
                fontSize: { xs: 28, md: 36 },
                fontWeight: 700,
              }}
            >
              My children
            </Typography>

            <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
              Add each child once, then join their class with the code from the
              treasurer.
            </Typography>
          </Box>

          {children.length > 0 && (
            <AppButton label="Add child" onClick={handleAdd} />
          )}
        </Stack>

        {isPending ? (
          <CircularProgress sx={{ alignSelf: 'center' }} />
        ) : isError ? (
          <Typography color="error">Could not load your children.</Typography>
        ) : children.length === 0 ? (
          <WhiteCard>
            <Stack
              spacing={1.5}
              sx={{ alignItems: 'center', textAlign: 'center', py: 2 }}
            >
              <Typography component="h2" sx={{ fontSize: 22, fontWeight: 700 }}>
                Add your first child
              </Typography>

              <Typography sx={{ maxWidth: 420, color: 'text.secondary' }}>
                You need a child on your account before you can join a class and
                pay for its fundraisers.
              </Typography>

              <AppButton label="Add child" onClick={handleAdd} />
            </Stack>
          </WhiteCard>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gap: 2.5,
              gridTemplateColumns:
                'repeat(auto-fill, minmax(min(300px, 100%), 1fr))',
            }}
          >
            {children.map((child) => (
              <ChildCard
                key={child.id}
                child={child}
                onEdit={handleEdit}
                onRemove={handleRemove}
              />
            ))}
          </Box>
        )}
      </Stack>

      {/* REMOVE CHILD */}
      <RemoveChildDialog
        open={!!childToRemove}
        firstName={childToRemove?.first_name ?? ''}
        lastName={childToRemove?.last_name ?? ''}
        className={childToRemove?.school_class?.name ?? null}
        onClose={handleCloseRemove}
        onConfirm={handleConfirmRemove}
        loading={removeChild.isPending}
        error={removeChild.error}
      />

      {/* ADD CHILD */}
      <AddChildDialog
        open={isAddOpen}
        onClose={handleCloseAdd}
        onConfirm={handleConfirmAdd}
        loading={createChild.isPending}
        error={createChild.error}
      />

      {/* EDIT CHILD */}
      <EditChildDialog
        open={!!childToEdit}
        child={childToEdit}
        onClose={handleCloseEdit}
        onConfirm={handleConfirmEdit}
        loading={updateChild.isPending}
        error={updateChild.error}
      />
    </>
  )
}
