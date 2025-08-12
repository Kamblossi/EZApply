import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Grid,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { referenceContactSchema, type ReferenceContact } from '../../validators/profile';

interface ReferenceFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ReferenceContact) => void;
  initialData?: ReferenceContact;
  isEdit?: boolean;
}

export const ReferenceForm: React.FC<ReferenceFormProps> = ({
  open,
  onClose,
  onSubmit,
  initialData,
  isEdit = false,
}) => {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ReferenceContact>({
    resolver: zodResolver(referenceContactSchema),
    defaultValues: {
      name: '',
      relationship: '',
      email: '',
      phone: '',
      company: '',
      position: '',
    },
  });

  React.useEffect(() => {
    if (initialData) {
      reset(initialData);
    } else {
      reset({
        name: '',
        relationship: '',
        email: '',
        phone: '',
        company: '',
        position: '',
      });
    }
  }, [initialData, reset]);

  const handleFormSubmit = async (data: ReferenceContact) => {
    await onSubmit(data);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {isEdit ? 'Edit Reference Record' : 'Add Reference Record'}
      </DialogTitle>
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="name"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Full Name"
                      fullWidth
                      error={!!errors.name}
                      helperText={errors.name?.message}
                      required
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="relationship"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Relationship"
                      fullWidth
                      error={!!errors.relationship}
                      helperText={errors.relationship?.message}
                      required
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="email"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Email"
                      fullWidth
                      error={!!errors.email}
                      helperText={errors.email?.message}
                      type="email"
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="phone"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Phone Number"
                      fullWidth
                      error={!!errors.phone}
                      helperText={errors.phone?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="company"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Company/Organization"
                      fullWidth
                      error={!!errors.company}
                      helperText={errors.company?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="position"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Job Title/Position"
                      fullWidth
                      error={!!errors.position}
                      helperText={errors.position?.message}
                    />
                  )}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : isEdit ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};