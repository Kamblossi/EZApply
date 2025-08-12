import { Grid, Box, Typography, Avatar, Button } from "@mui/material";
import { Control, FieldValues, Controller } from "react-hook-form";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { ControlledTextField } from "../../components/profile/ControlledTextField"; // Assuming path
import React from "react";

interface PersonalInformationTabProps<T extends FieldValues> {
  control: Control<T>;
}

export const PersonalInformationTab = <T extends FieldValues>({ control }: PersonalInformationTabProps<T>) => {
  // Local state for avatar preview
  const [avatarPreview, setAvatarPreview] = React.useState<string | null>(null);

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
          setAvatarPreview(URL.createObjectURL(file));
          // Here you would also use control.setValue('avatar_file', file) to store the file for upload
      }
  };

  // Guard against null control
  if (!control) {
    return <Box sx={{ p: 3 }}>Loading form...</Box>;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={3}>
        {/* AVATAR UPLOAD */}
        <Grid item xs={12} sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <Avatar 
            src={avatarPreview ?? undefined} 
            sx={{ width: 80, height: 80 }}
          />
          <Button variant="contained" component="label">
            Upload Photo
            <input type="file" hidden accept="image/*" onChange={handleAvatarChange} />
          </Button>
        </Grid>

        {/* PERSONAL DETAILS */}
        <Grid item xs={12} md={6}>
          <ControlledTextField
            name={"personal_information.forename" as any}
            control={control}
            label="Forename"
            required
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <ControlledTextField
            name={"personal_information.surname" as any}
            control={control}
            label="Surname"
            required
          />
        </Grid>
        <Grid item xs={12} md={6}>
            <Controller
                name={"personal_information.date_of_birth" as any}
                control={control}
                render={({ field, fieldState: { error } }) => (
                    <DatePicker
                        label="Date of Birth"
                        value={field.value ? new Date(field.value) : null}
                        onChange={(newValue) => field.onChange(newValue)}
                        slotProps={{
                            textField: {
                                fullWidth: true,
                                error: !!error,
                                helperText: error?.message,
                            },
                        }}
                    />
                )}
            />
        </Grid>
        <Grid item xs={12} md={6}>
          <ControlledTextField
            name={"personal_information.phone_number" as any}
            control={control}
            label="Mobile Phone"
          />
        </Grid>
        
        {/* ADDRESS DETAILS */}
        <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>Address</Typography>
        </Grid>
        <Grid item xs={12}>
            <ControlledTextField name={"personal_information.address_line_1" as any} control={control} label="Address Line 1" required/>
        </Grid>
        <Grid item xs={12}>
            <ControlledTextField name={"personal_information.address_line_2" as any} control={control} label="Address Line 2 (Optional)"/>
        </Grid>
        <Grid item xs={12} md={6}>
            <ControlledTextField name={"personal_information.town_city" as any} control={control} label="Town/City" required/>
        </Grid>
        <Grid item xs={12} md={6}>
            <ControlledTextField name={"personal_information.postcode" as any} control={control} label="Postcode" required/>
        </Grid>
      </Grid>
    </Box>
  );
};