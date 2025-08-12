import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Grid } from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { ControlledTextField } from "./ControlledTextField";
import { educationRecordSchema } from "../../validators/profile"; // Frontend validator path
import { z } from "zod";
import { useEffect } from "react";

type FormData = z.infer<typeof educationRecordSchema>;

interface EducationRecordDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: FormData) => void;
  initialValues?: Partial<FormData> | null;
}

export const EducationRecordDialog = ({ open, onClose, onSubmit, initialValues }: EducationRecordDialogProps) => {
  const { control, handleSubmit, reset } = useForm<FormData>({
    resolver: zodResolver(educationRecordSchema),
    defaultValues: initialValues || {},
  });

  useEffect(() => {
    if (open) {
      reset(initialValues || { institution: '', qualification: '', grade: '', start_date: undefined, end_date: undefined });
    }
  }, [initialValues, reset, open]);

  const handleFormSubmit = (data: FormData) => {
    onSubmit(data);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{initialValues ? "Edit" : "Add"} Education Record</DialogTitle>
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <DialogContent>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid item xs={12}><ControlledTextField name="institution" control={control} label="Institution" required /></Grid>
            <Grid item xs={12}><ControlledTextField name="qualification" control={control} label="Qualification" required /></Grid>
            <Grid item xs={12}><ControlledTextField name="grade" control={control} label="Grade / Score" required /></Grid>
            <Grid item xs={12} md={6}>
              <Controller
                name="start_date"
                control={control}
                render={({ field }) => <DatePicker {...field} label="Start Date" sx={{ width: '100%' }} />}
              />
            </Grid>
            <Grid item xs={12} md={6}>
                <Controller
                    name="end_date"
                    control={control}
                    render={({ field }) => <DatePicker {...field} label="End Date" sx={{ width: '100%' }} />}
                />
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