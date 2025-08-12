import { Edit } from "@refinedev/mui";
import { useDataProvider, useOne } from "@refinedev/core";
import {
  Tabs,
  Tab,
  Box,
  Stack,
  Avatar,
  IconButton,
  Typography,
  TextField,
  Paper,
  Button,
  Alert,
  CircularProgress,
  Divider,
  Grid,
} from "@mui/material";
import { DataGrid, GridActionsCellItem, GridColDef } from "@mui/x-data-grid";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import PersonIcon from "@mui/icons-material/Person";
import WorkIcon from "@mui/icons-material/Work";
import SchoolIcon from "@mui/icons-material/School";
import ContactsIcon from "@mui/icons-material/Contacts";
import UploadIcon from "@mui/icons-material/Upload";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/ModeEditOutline";
import AddIcon from "@mui/icons-material/Add";
import SaveIcon from "@mui/icons-material/Save";
import { motion, AnimatePresence } from "framer-motion";
import { useForm, FormProvider, useWatch, useFormContext, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import dayjs from "dayjs";
import React from "react";
import { EmploymentForm } from "../../components/profile/EmploymentForm";
import { EducationForm } from "../../components/profile/EducationForm";
import { ReferenceForm } from "../../components/profile/ReferenceForm";
import { completeProfileSchema, type CompleteProfile, type EmploymentRecord, type EducationRecord, type ReferenceContact } from "../../validators/profile";

function TabPanel(props: { children?: React.ReactNode; index: number; value: number }) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`profile-tabpanel-${index}`}
      aria-labelledby={`profile-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

// Avatar upload component
const AvatarField = () => {
  const { setValue } = useFormContext();
  const file = useWatch({ name: "avatar" });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setValue("avatar", selectedFile);
    }
  };

  return (
    <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
      <Avatar
        src={file ? URL.createObjectURL(file) : undefined}
        sx={{ width: 72, height: 72, border: '2px solid', borderColor: 'primary.main', boxShadow: 2 }}
      />
      <label htmlFor="avatar-upload">
        <input hidden id="avatar-upload" type="file" accept="image/*" onChange={handleChange} />
        <IconButton 
          component="span" 
          color="primary" 
          tabIndex={0}
          sx={{ bgcolor: 'background.paper', borderRadius: 2, boxShadow: 1 }}
        >
          <UploadIcon />
        </IconButton>
      </label>
      <Typography variant="body2" color="text.secondary">
        Upload a profile photo
      </Typography>
    </Stack>
  );
};

// Enhanced Personal Information Tab with Controller
const PersonalInfoTab = () => {
  const { control, formState: { errors } } = useFormContext<CompleteProfile>();

  return (
    <Paper elevation={1} sx={{ p: 3, borderRadius: 3 }}>
      <AvatarField />
      
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <Controller
            name="forename"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Forename"
                fullWidth
                variant="outlined"
                error={!!errors.forename}
                helperText={errors.forename?.message}
                required
              />
            )}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <Controller
            name="surname"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Surname"
                fullWidth
                variant="outlined"
                error={!!errors.surname}
                helperText={errors.surname?.message}
                required
              />
            )}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <Controller
            name="mobile_phone"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Mobile Phone"
                fullWidth
                variant="outlined"
                type="tel"
                error={!!errors.mobile_phone}
                helperText={errors.mobile_phone?.message}
              />
            )}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <Controller
            name="dob"
            control={control}
            render={({ field }) => (
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Date of Birth"
                  value={field.value}
                  onChange={field.onChange}
                  slotProps={{ 
                    textField: { 
                      fullWidth: true, 
                      variant: "outlined",
                      error: !!errors.dob,
                      helperText: errors.dob?.message
                    } 
                  }}
                />
              </LocalizationProvider>
            )}
          />
        </Grid>
      </Grid>

      <Divider sx={{ my: 3 }} />
      
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
        Address Information
      </Typography>
      
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Controller
            name="address_line_1"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Address Line 1"
                fullWidth
                variant="outlined"
                error={!!errors.address_line_1}
                helperText={errors.address_line_1?.message}
              />
            )}
          />
        </Grid>
        <Grid item xs={12}>
          <Controller
            name="address_line_2"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Address Line 2"
                fullWidth
                variant="outlined"
                error={!!errors.address_line_2}
                helperText={errors.address_line_2?.message}
              />
            )}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <Controller
            name="city"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="City"
                fullWidth
                variant="outlined"
                error={!!errors.city}
                helperText={errors.city?.message}
              />
            )}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <Controller
            name="county"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="County"
                fullWidth
                variant="outlined"
                error={!!errors.county}
                helperText={errors.county?.message}
              />
            )}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <Controller
            name="postcode"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Postcode"
                fullWidth
                variant="outlined"
                error={!!errors.postcode}
                helperText={errors.postcode?.message}
              />
            )}
          />
        </Grid>
        <Grid item xs={12}>
          <Controller
            name="country"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Country"
                fullWidth
                variant="outlined"
                placeholder="e.g., United Kingdom"
                error={!!errors.country}
                helperText={errors.country?.message}
              />
            )}
          />
        </Grid>
      </Grid>
    </Paper>
  );
};

// Employment Tab using useFieldArray
const EmploymentTab = () => {
  const { control } = useFormContext<CompleteProfile>();
  const [openDialog, setOpenDialog] = React.useState(false);
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null);

  const { fields, append, remove, update } = useFieldArray({
    control,
    name: "employment_records",
  });

  const columns: GridColDef[] = [
    { field: "employer", headerName: "Company", flex: 1 },
    { field: "position", headerName: "Position", flex: 1 },
    {
      field: "start_date",
      headerName: "From",
      width: 120,
      valueFormatter: ({ value }) => value ? dayjs(value).format("MMM YYYY") : "",
    },
    {
      field: "end_date",
      headerName: "To",
      width: 120,
      valueFormatter: ({ value }) => value ? dayjs(value).format("MMM YYYY") : "Present",
    },
    {
      type: "actions",
      field: "actions",
      headerName: "Actions",
      width: 120,
      getActions: (params) => [
        <GridActionsCellItem
          key="edit"
          icon={<EditIcon />}
          label="Edit"
          onClick={() => {
            setEditingIndex(params.row.index);
            setOpenDialog(true);
          }}
        />,
        <GridActionsCellItem
          key="delete"
          icon={<DeleteIcon />}
          label="Delete"
          onClick={() => remove(params.row.index)}
        />,
      ],
    },
  ];

  const handleAddNew = () => {
    setEditingIndex(null);
    setOpenDialog(true);
  };

  const handleSubmit = (data: EmploymentRecord) => {
    if (editingIndex !== null) {
      update(editingIndex, data);
    } else {
      append(data);
    }
    setOpenDialog(false);
    setEditingIndex(null);
  };

  const rows = fields.map((field, index) => ({ ...field, index }));

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Paper elevation={1} sx={{ p: 2, borderRadius: 3 }}>
        <Button 
          startIcon={<AddIcon />} 
          variant="contained" 
          sx={{ mb: 2 }} 
          onClick={handleAddNew}
        >
          Add Employment
        </Button>
        
        <DataGrid
          rows={rows}
          columns={columns}
          autoHeight
          density="comfortable"
          disableRowSelectionOnClick
          hideFooter={rows.length <= 5}
          sx={{ border: 'none' }}
        />
        
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <EmploymentForm
            open={openDialog}
            onClose={() => setOpenDialog(false)}
            onSubmit={handleSubmit}
            initialData={editingIndex !== null ? fields[editingIndex] : undefined}
            isEdit={editingIndex !== null}
          />
        </LocalizationProvider>
      </Paper>
    </motion.div>
  );
};

// Education Tab using useFieldArray
const EducationTab = () => {
  const { control } = useFormContext<CompleteProfile>();
  const [openDialog, setOpenDialog] = React.useState(false);
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null);

  const { fields, append, remove, update } = useFieldArray({
    control,
    name: "education_records",
  });

  const columns: GridColDef[] = [
    { field: "institution", headerName: "Institution", flex: 1 },
    { field: "degree_diploma", headerName: "Degree", flex: 1 },
    { field: "grade_score", headerName: "Grade", width: 120 },
    {
      field: "end_date",
      headerName: "Completed",
      width: 120,
      valueFormatter: ({ value }) => value ? dayjs(value).format("MMM YYYY") : "",
    },
    {
      type: "actions",
      field: "actions",
      headerName: "Actions",
      width: 120,
      getActions: (params) => [
        <GridActionsCellItem
          key="edit"
          icon={<EditIcon />}
          label="Edit"
          onClick={() => {
            setEditingIndex(params.row.index);
            setOpenDialog(true);
          }}
        />,
        <GridActionsCellItem
          key="delete"
          icon={<DeleteIcon />}
          label="Delete"
          onClick={() => remove(params.row.index)}
        />,
      ],
    },
  ];

  const handleAddNew = () => {
    setEditingIndex(null);
    setOpenDialog(true);
  };

  const handleSubmit = (data: EducationRecord) => {
    if (editingIndex !== null) {
      update(editingIndex, data);
    } else {
      append(data);
    }
    setOpenDialog(false);
    setEditingIndex(null);
  };

  const rows = fields.map((field, index) => ({ ...field, index }));

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Paper elevation={1} sx={{ p: 2, borderRadius: 3 }}>
        <Button 
          startIcon={<AddIcon />} 
          variant="contained" 
          sx={{ mb: 2 }} 
          onClick={handleAddNew}
        >
          Add Education
        </Button>
        
        <DataGrid
          rows={rows}
          columns={columns}
          autoHeight
          density="comfortable"
          disableRowSelectionOnClick
          hideFooter={rows.length <= 5}
          sx={{ border: 'none' }}
        />
        
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <EducationForm
            open={openDialog}
            onClose={() => setOpenDialog(false)}
            onSubmit={handleSubmit}
            initialData={editingIndex !== null ? fields[editingIndex] : undefined}
            isEdit={editingIndex !== null}
          />
        </LocalizationProvider>
      </Paper>
    </motion.div>
  );
};

// References Tab using useFieldArray
const ReferencesTab = () => {
  const { control } = useFormContext<CompleteProfile>();
  const [openDialog, setOpenDialog] = React.useState(false);
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null);

  const { fields, append, remove, update } = useFieldArray({
    control,
    name: "reference_contacts",
  });

  const columns: GridColDef[] = [
    { field: "name", headerName: "Name", flex: 1 },
    { field: "position", headerName: "Position", flex: 1 },
    { field: "company", headerName: "Company", flex: 1 },
    { field: "email", headerName: "Email", flex: 1 },
    { field: "phone", headerName: "Phone", width: 150 },
    {
      type: "actions",
      field: "actions",
      headerName: "Actions",
      width: 120,
      getActions: (params) => [
        <GridActionsCellItem
          key="edit"
          icon={<EditIcon />}
          label="Edit"
          onClick={() => {
            setEditingIndex(params.row.index);
            setOpenDialog(true);
          }}
        />,
        <GridActionsCellItem
          key="delete"
          icon={<DeleteIcon />}
          label="Delete"
          onClick={() => remove(params.row.index)}
        />,
      ],
    },
  ];

  const handleAddNew = () => {
    setEditingIndex(null);
    setOpenDialog(true);
  };

  const handleSubmit = (data: ReferenceContact) => {
    if (editingIndex !== null) {
      update(editingIndex, data);
    } else {
      append(data);
    }
    setOpenDialog(false);
    setEditingIndex(null);
  };

  const rows = fields.map((field, index) => ({ ...field, index }));

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Paper elevation={1} sx={{ p: 2, borderRadius: 3 }}>
        <Button 
          startIcon={<AddIcon />} 
          variant="contained" 
          sx={{ mb: 2 }} 
          onClick={handleAddNew}
        >
          Add Reference
        </Button>
        
        <DataGrid
          rows={rows}
          columns={columns}
          autoHeight
          density="comfortable"
          disableRowSelectionOnClick
          hideFooter={rows.length <= 5}
          sx={{ border: 'none' }}
        />
        
        <ReferenceForm
          open={openDialog}
          onClose={() => setOpenDialog(false)}
          onSubmit={handleSubmit}
          initialData={editingIndex !== null ? fields[editingIndex] : undefined}
          isEdit={editingIndex !== null}
        />
      </Paper>
    </motion.div>
  );
};

export const ProfileEdit = () => {
  const [tab, setTab] = React.useState(0);
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveMessage, setSaveMessage] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Load profile data
  const { data: profileData, isLoading: isLoadingProfile, refetch } = useOne({
    resource: "profile",
    id: "me",
  });

  // Initialize form with Zod validation and useFieldArray
  const methods = useForm<CompleteProfile>({
    resolver: zodResolver(completeProfileSchema),
    defaultValues: {
      forename: '',
      surname: '',
      mobile_phone: '',
      dob: null,
      address_line_1: '',
      address_line_2: '',
      city: '',
      county: '',
      country: '',
      postcode: '',
      avatar: null,
      employment_records: [],
      education_records: [],
      reference_contacts: [],
    },
    values: profileData?.data ? {
      forename: profileData.data.forename || '',
      surname: profileData.data.surname || '',
      mobile_phone: profileData.data.mobile_phone || '',
      dob: profileData.data.available_date ? new Date(profileData.data.available_date) : null,
      address_line_1: profileData.data.address_line_1 || '',
      address_line_2: profileData.data.address_line_2 || '',
      city: profileData.data.city || '',
      county: profileData.data.county || '',
      country: profileData.data.country || '',
      postcode: profileData.data.postcode || '',
      avatar: null,
      employment_records: profileData.data.employment_records || [],
      education_records: profileData.data.education_records || [],
      reference_contacts: profileData.data.reference_contacts || [],
    } : undefined
  });

  const { handleSubmit } = methods;
  const dataProvider = useDataProvider();

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTab(newValue);
  };

  // Save the entire profile as one atomic transaction
  const onSubmit = async (data: CompleteProfile) => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      const profilePayload = {
        ...data,
        available_date: data.dob ? data.dob.toISOString() : null,
        // Convert employment_records dates to ISO strings
        employment_records: data.employment_records.map(record => ({
          ...record,
          start_date: record.start_date ? record.start_date.toISOString() : null,
          end_date: record.end_date ? record.end_date.toISOString() : null,
        })),
        // Convert education_records dates to ISO strings
        education_records: data.education_records.map(record => ({
          ...record,
          start_date: record.start_date ? record.start_date.toISOString() : null,
          end_date: record.end_date ? record.end_date.toISOString() : null,
        })),
        // Ensure we include other required fields
        user_documents: [],
        user_skills: []
      };

      await dataProvider().update({
        resource: "profile",
        id: "me",
        variables: profilePayload,
      });

      setSaveMessage({ type: 'success', text: 'Profile saved successfully!' });
      refetch();
    } catch (error: any) {
      console.error('Profile save error:', error);
      setSaveMessage({ 
        type: 'error', 
        text: error?.message || 'Failed to save profile. Please try again.' 
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingProfile) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <FormProvider {...methods}>
      <Edit 
        title={<Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>My Profile</Typography>}
        saveButtonProps={{
          onClick: handleSubmit(onSubmit as any),
          disabled: isSaving,
          startIcon: isSaving ? <CircularProgress size={20} /> : <SaveIcon />,
          children: isSaving ? 'Saving...' : 'Save Profile'
        }}
      >
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          {/* Save Status Message */}
          {saveMessage && (
            <Alert 
              severity={saveMessage.type} 
              sx={{ mb: 2 }}
              onClose={() => setSaveMessage(null)}
            >
              {saveMessage.text}
            </Alert>
          )}

          <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 3, boxShadow: 3 }}>
            <Tabs
              value={tab}
              onChange={handleTabChange}
              aria-label="Profile tabs"
              variant="scrollable"
              scrollButtons="auto"
              sx={{ 
                mb: 2,
                '& .MuiTabs-indicator': {
                  backgroundColor: 'primary.main',
                  height: 3,
                  borderRadius: 1.5,
                }
              }}
            >
              <Tab 
                icon={<PersonIcon />} 
                label="Personal" 
                id="profile-tab-0"
                sx={{ textTransform: 'none' }}
              />
              <Tab 
                icon={<WorkIcon />} 
                label="Employment" 
                id="profile-tab-1"
                sx={{ textTransform: 'none' }}
              />
              <Tab 
                icon={<SchoolIcon />} 
                label="Education" 
                id="profile-tab-2"
                sx={{ textTransform: 'none' }}
              />
              <Tab 
                icon={<ContactsIcon />} 
                label="References" 
                id="profile-tab-3"
                sx={{ textTransform: 'none' }}
              />
            </Tabs>
            
            <AnimatePresence mode="wait">
              <TabPanel value={tab} index={0} key={0}>
                <PersonalInfoTab />
              </TabPanel>
              
              <TabPanel value={tab} index={1} key={1}>
                <EmploymentTab />
              </TabPanel>
              
              <TabPanel value={tab} index={2} key={2}>
                <EducationTab />
              </TabPanel>
              
              <TabPanel value={tab} index={3} key={3}>
                <ReferencesTab />
              </TabPanel>
            </AnimatePresence>
          </Box>
        </motion.div>
      </Edit>
    </FormProvider>
  );
};
