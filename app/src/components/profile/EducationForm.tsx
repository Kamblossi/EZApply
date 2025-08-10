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

const educationSchema = z.object({
  institution: z.string().min(2, 'Institution name must be at least 2 characters'),
  qualification_type: z.string().min(2, 'Qualification type must be at least 2 characters'),
  degree_diploma: z.string().min(2, 'Degree/diploma must be at least 2 characters'),
  field_of_study: z.string().min(2, 'Field of study must be at least 2 characters').optional().nullable(),
  start_date: z.coerce.date({ required_error: 'Start date is required' }),
  end_date: z.coerce.date().nullable().optional(),
  grade_score: z.string().max(100, 'Grade/score cannot exceed 100 characters').optional().nullable(),
});

type EducationFormData = z.infer<typeof educationSchema>;

interface EducationFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: EducationFormData) => Promise<void>;
  initialData?: any;
  isEdit?: boolean;
}

export const EducationForm: React.FC<EducationFormProps> = ({
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
  } = useForm<EducationFormData>({
    resolver: zodResolver(educationSchema),
    defaultValues: initialData || {
      institution: '',
      qualification_type: '',
      degree_diploma: '',
      field_of_study: '',
      start_date: null,
      end_date: null,
      grade_score: '',
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
        institution: '',
        qualification_type: '',
        degree_diploma: '',
        field_of_study: '',
        start_date: null,
        end_date: null,
        grade_score: '',
      });
    }
  }, [initialData, reset]);

  const handleFormSubmit = async (data: EducationFormData) => {
    await onSubmit(data);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {isEdit ? 'Edit Education Record' : 'Add Education Record'}
      </DialogTitle>
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <DialogContent>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="institution"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Institution"
                        fullWidth
                        error={!!errors.institution}
                        helperText={errors.institution?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="qualification_type"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Qualification Type"
                        fullWidth
                        error={!!errors.qualification_type}
                        helperText={errors.qualification_type?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="degree_diploma"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Degree/Diploma"
                        fullWidth
                        error={!!errors.degree_diploma}
                        helperText={errors.degree_diploma?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="field_of_study"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Field of Study"
                        fullWidth
                        error={!!errors.field_of_study}
                        helperText={errors.field_of_study?.message}
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
                    name="grade_score"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Grade/Score"
                        fullWidth
                        error={!!errors.grade_score}
                        helperText={errors.grade_score?.message}
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