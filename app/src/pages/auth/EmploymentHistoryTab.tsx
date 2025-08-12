import React from "react";
import { Box, Button, Typography, IconButton } from "@mui/material";
import { Control, useFieldArray } from "react-hook-form";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { EmploymentRecordDialog } from "../../components/profile/EmploymentRecordDialog";

interface EmploymentHistoryTabProps {
  control: Control<any>;
}

type DialogState = {
    open: boolean;
    initialValues?: Record<string, any> | null;
    editIndex?: number;
}

export const EmploymentHistoryTab = ({ control }: EmploymentHistoryTabProps) => {
  const { fields, append, remove, update } = useFieldArray({
    control,
    name: "employment_records",
  });

  const [dialogState, setDialogState] = React.useState<DialogState>({ open: false });
  
  const handleOpenDialog = (editIndex?: number) => {
    const initialValues = editIndex !== undefined ? fields[editIndex] : null;
    setDialogState({ open: true, initialValues: initialValues as any, editIndex });
  };

  const handleCloseDialog = () => {
    setDialogState({ open: false });
  };

  const handleSubmitDialog = (data: any) => {
    if (dialogState.editIndex !== undefined) {
      update(dialogState.editIndex, data);
    } else {
      append(data);
    }
  };

  const columns: GridColDef[] = [
    { field: 'job_title', headerName: 'Job Title', flex: 1 },
    { field: 'company', headerName: 'Company', flex: 1 },
    { field: 'start_date', headerName: 'Start Date', flex: 1, valueFormatter: ({ value }) => value ? new Date(value).toLocaleDateString() : '' },
    { field: 'end_date', headerName: 'End Date', flex: 1, valueFormatter: ({ value }) => value ? new Date(value).toLocaleDateString() : 'Present' },
    {
        field: 'actions',
        headerName: 'Actions',
        sortable: false,
        renderCell: (params) => {
            const index = fields.findIndex(f => f.id === params.id);
            return (
                <>
                    <IconButton onClick={() => handleOpenDialog(index)}><EditIcon /></IconButton>
                    <IconButton onClick={() => remove(index)}><DeleteIcon /></IconButton>
                </>
            )
        }
    }
  ];

  return (
    <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Employment History</Typography>
            <Button variant="contained" onClick={() => handleOpenDialog()}>Add Record</Button>
        </Box>
        <Box sx={{ height: 400, width: '100%' }}>
            <DataGrid
                rows={fields}
                columns={columns}
                pageSizeOptions={[5]}
                initialState={{ pagination: { paginationModel: { pageSize: 5 } } }}
                disableRowSelectionOnClick
            />
        </Box>
        <EmploymentRecordDialog 
            open={dialogState.open}
            onClose={handleCloseDialog}
            onSubmit={handleSubmitDialog}
            initialValues={dialogState.initialValues}
        />
    </Box>
  );
};