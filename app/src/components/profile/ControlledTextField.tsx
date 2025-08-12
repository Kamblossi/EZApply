import { TextField, TextFieldProps } from "@mui/material";
import { Controller, Control, FieldValues, Path } from "react-hook-form";

type ControlledTextFieldProps<T extends FieldValues> = {
  control: Control<T>;
  name: Path<T>;
} & TextFieldProps;

export const ControlledTextField = <T extends FieldValues>({
  control,
  name,
  ...rest
}: ControlledTextFieldProps<T>) => {
  // Guard against null control
  if (!control) {
    return (
      <TextField
        {...rest}
        fullWidth
        variant="outlined"
        disabled
        placeholder="Loading..."
      />
    );
  }

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <TextField
          {...field}
          {...rest}
          fullWidth
          variant="outlined"
          error={!!error}
          helperText={error ? error.message : rest.helperText}
        />
      )}
    />
  );
};