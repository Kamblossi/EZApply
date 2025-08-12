import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Grid } from "@mui/material";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ControlledTextField } from "./ControlledTextField";
import { referenceContactSchema } from "../../validators/profile"; // Adjust path
import { z } from "zod";
import { useEffect } from "react";

type FormData = z.infer<typeof referenceContactSchema>;

interface ReferenceContactDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: FormData) => void;
  initialValues?: Partial<FormData> | null;
}

export const ReferenceContactDialog = ({ open, onClose, onSubmit, initialValues }: ReferenceContactDialogProps) => {
  const { control, handleSubmit, reset } = useForm<FormData>({
    resolver: zodResolver(referenceContactSchema),
  });

  useEffect(() => {
    if (open) {
      reset(initialValues || {});
    }
  }, [initialValues, reset, open]);

  const handleFormSubmit = (data: FormData) => {
    onSubmit(data);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{initialValues ? "Edit" : "Add"} Reference</DialogTitle>
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <DialogContent>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid item xs={12}><ControlledTextField name="name" control={control} label="Full Name" required /></Grid>
            <Grid item xs={12} md={6}><ControlledTextField name="email" control={control} label="Email Address" required /></Grid>
            <Grid item xs={12} md={6}><ControlledTextField name="phone_number" control={control} label="Phone Number" /></Grid>
            <Grid item xs={12} md={6}><ControlledTextField name="company" control={control} label="Company" required /></Grid>
            <Grid item xs={12} md={6}><ControlledTextField name="position" control={control} label="Position / Title" required /></Grid>
            <Grid item xs={12}><ControlledTextField name="relationship" control={control} label="Relationship to you" required /></Grid>
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