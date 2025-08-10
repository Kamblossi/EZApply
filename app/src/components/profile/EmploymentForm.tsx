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
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const employmentSchema = z.object({
  employer: z.string().min(2, 'Employer name must be at least 2 characters'),
  position: z.string().min(2, 'Position must be at least 2 characters'),
  start_date: z.coerce.date({ required_error: 'Start date is required' }),
  end_date: z.coerce.date().nullable().optional(),
  responsibilities: z.string().max(5000).optional(),
  reason_for_leaving: z.string().max(1000).optional(),
  salary_information: z.string().max(500).optional(),
});

type EmploymentFormData = z.infer<typeof employmentSchema>;

interface EmploymentFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: EmploymentFormData) => Promise<void>;
  initialData?: any;
  isEdit?: boolean;
}

export const EmploymentForm: React.FC<EmploymentFormProps> = ({
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
  } = useForm<EmploymentFormData>({
    resolver: zodResolver(employmentSchema),
    defaultValues: initialData || {
      employer: '',
      position: '',
      start_date: null,
      end_date: null,
      responsibilities: '',
      reason_for_leaving: '',
      salary_information: '',
    },
  });

  React.useEffect(() => {
    if (initialData) {
      reset({
        ...initialData,
        start_date: initialData.start_date ? new Date(initialData.start_date) : null,
        end_date: initialData.end_date ? new Date(initialData.end_date) : null,
      });
    } else {
      reset({
        employer: '',
        position: '',
        start_date: null,
        end_date: null,
        responsibilities: '',
        reason_for_leaving: '',
        salary_information: '',
      });
    }
  }, [initialData, reset]);

  const handleFormSubmit = async (data: EmploymentFormData) => {
    await onSubmit(data);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {isEdit ? 'Edit Employment Record' : 'Add Employment Record'}
      </DialogTitle>
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <DialogContent>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="employer"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Employer"
                        fullWidth
                        error={!!errors.employer}
                        helperText={errors.employer?.message}
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
                        label="Position/Role"
                        fullWidth
                        error={!!errors.position}
                        helperText={errors.position?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="start_date"
                    control={control}
                    render={({ field }) => (
                      <DatePicker
                        label="Start Date"
                        value={field.value}
                        onChange={field.onChange}
                        slotProps={{
                          textField: {
                            fullWidth: true,
                            error: !!errors.start_date,
                            helperText: errors.start_date?.message,
                          },
                        }}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="end_date"
                    control={control}
                    render={({ field }) => (
                      <DatePicker
                        label="End Date (Leave empty if current)"
                        value={field.value}
                        onChange={field.onChange}
                        slotProps={{
                          textField: {
                            fullWidth: true,
                            error: !!errors.end_date,
                            helperText: errors.end_date?.message,
                          },
                        }}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Controller
                    name="responsibilities"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Responsibilities"
                        fullWidth
                        multiline
                        rows={4}
                        error={!!errors.responsibilities}
                        helperText={errors.responsibilities?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="reason_for_leaving"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Reason for Leaving"
                        fullWidth
                        multiline
                        rows={2}
                        error={!!errors.reason_for_leaving}
                        helperText={errors.reason_for_leaving?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="salary_information"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Salary Information"
                        fullWidth
                        error={!!errors.salary_information}
                        helperText={errors.salary_information?.message}
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </Box>
          </LocalizationProvider>
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
