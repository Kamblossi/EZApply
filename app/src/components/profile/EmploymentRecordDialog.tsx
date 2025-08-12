import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Grid, Checkbox, FormControlLabel } from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { ControlledTextField } from "./ControlledTextField";
import { employmentRecordSchema } from "../../validators/profile";
import { z } from "zod";
import { useEffect } from "react";

type FormData = z.infer<typeof employmentRecordSchema>;

interface EmploymentRecordDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: FormData) => void;
  initialValues?: Partial<FormData> | null;
}

export const EmploymentRecordDialog = ({ open, onClose, onSubmit, initialValues }: EmploymentRecordDialogProps) => {
  const { control, handleSubmit, reset, watch, setValue } = useForm<FormData>({
    resolver: zodResolver(employmentRecordSchema),
    defaultValues: initialValues || {},
  });

  const isCurrentJob = watch('end_date') === null;

  useEffect(() => {
    if (open) {
        if (initialValues) {
            reset({
                ...initialValues,
                start_date: initialValues.start_date ? new Date(initialValues.start_date) : undefined,
                end_date: initialValues.end_date ? new Date(initialValues.end_date) : null,
            });
        } else {
            reset({
                job_title: '',
                company: '',
                start_date: undefined,
                end_date: undefined,
                responsibilities: '',
                reason_for_leaving: '',
            });
        }
    }
  }, [initialValues, reset, open]);

  const handleFormSubmit = (data: FormData) => {
    onSubmit(data);
    onClose();
  };
  
  const handleCurrentJobChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
        setValue('end_date', null);
    } else {
        setValue('end_date', new Date()); // Or undefined, based on desired behavior
    }
  };


  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{initialValues ? "Edit" : "Add"} Employment Record</DialogTitle>
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <DialogContent>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid item xs={12}><ControlledTextField name="job_title" control={control} label="Job Title" required /></Grid>
            <Grid item xs={12}><ControlledTextField name="company" control={control} label="Company" required /></Grid>
            <Grid item xs={12} md={6}>
              <Controller
                name="start_date"
                control={control}
                render={({ field, fieldState: { error } }) => (
                    <DatePicker 
                        {...field} 
                        label="Start Date" 
                        sx={{ width: '100%' }} 
                        value={field.value || null}
                        onChange={(date) => field.onChange(date)}
                        slotProps={{ textField: { error: !!error, helperText: error?.message } }}
                    />
                )}
              />
            </Grid>
            <Grid item xs={12} md={6}>
                <Controller
                    name="end_date"
                    control={control}
                    render={({ field, fieldState: { error } }) => (
                        <DatePicker 
                            {...field} 
                            disabled={isCurrentJob} 
                            label="End Date" 
                            sx={{ width: '100%' }} 
                            value={field.value || null}
                            onChange={(date) => field.onChange(date)}
                            slotProps={{ textField: { error: !!error, helperText: error?.message } }}
                        />
                    )}
                />
            </Grid>
            <Grid item xs={12}>
                <FormControlLabel 
                    control={<Checkbox checked={isCurrentJob} onChange={handleCurrentJobChange} />} 
                    label="I currently work here" 
                />
            </Grid>
            <Grid item xs={12}>
                <ControlledTextField name="responsibilities" control={control} label="Responsibilities" multiline rows={4} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained">Save</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};