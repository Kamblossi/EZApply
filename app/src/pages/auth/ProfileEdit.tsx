import { Edit, useDataGrid } from "@refinedev/mui";
import { useDataProvider, useInvalidate, useOne } from "@refinedev/core";
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
import { useForm, FormProvider, useWatch, useFormContext } from "react-hook-form";
import dayjs from "dayjs";
import React from "react";
import { EmploymentForm } from "../../components/profile/EmploymentForm";
import { EducationForm } from "../../components/profile/EducationForm";
import { ReferenceForm } from "../../components/profile/ReferenceForm";

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
    <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
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

const EmploymentTable = () => {
  const dataProvider = useDataProvider();
  const invalidate = useInvalidate();
  const [openDialog, setOpenDialog] = React.useState(false);
  const [editingRecord, setEditingRecord] = React.useState<any>(null);
  const { dataGridProps } = useDataGrid({
    resource: "profile/employment",
    pagination: { pageSize: 5 },
  });

  const columns: GridColDef[] = [
    { field: "employer", headerName: "Organisation", flex: 1 },
    { field: "position", headerName: "Role/Title", flex: 1 },
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
            setEditingRecord(params.row);
            setOpenDialog(true);
          }}
        />,
        <GridActionsCellItem
          key="delete"
          icon={<DeleteIcon />}
          label="Delete"
          onClick={async () => {
            try {
              await dataProvider().deleteOne({
                resource: "profile/employment",
                id: params.id,
              });
              invalidate({
                resource: "profile/employment",
                invalidates: ["list"]
              });
            } catch (error) {
              console.error("Delete failed:", error);
            }
          }}
        />,
      ],
    },
  ];

  const handleAddEmployment = () => {
    setEditingRecord(null);
    setOpenDialog(true);
  };

  const handleEmploymentSubmit = async (data: any) => {
    try {
      if (editingRecord) {
        // Update existing record
        await dataProvider().update({
          resource: "profile/employment",
          id: editingRecord.id,
          variables: data,
        });
        
        // Refresh data grid
        invalidate({
          resource: "profile/employment",
          invalidates: ["list"]
        });
      } else {
        // Create new record
        await dataProvider().create({
          resource: "profile/employment",
          variables: data,
        });
        
        // Refresh data grid
        invalidate({
          resource: "profile/employment",
          invalidates: ["list"]
        });
      }
      
      // Refresh data grid
      invalidate({
        resource: "profile/employment",
        invalidates: ["list"]
      });
      
      setOpenDialog(false);
    } catch (error) {
      console.error("Error saving employment record:", error);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Paper elevation={1} sx={{ p: 2, borderRadius: 3 }}>
        <Button startIcon={<AddIcon />} variant="contained" sx={{ mb: 2 }} onClick={handleAddEmployment}>
          Add Employment
        </Button>
        <DataGrid
          {...dataGridProps}
          columns={columns}
          autoHeight
          density="comfortable"
          disableRowSelectionOnClick
        />
        
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <EmploymentForm
            open={openDialog}
            onClose={() => setOpenDialog(false)}
            onSubmit={handleEmploymentSubmit}
            initialData={editingRecord}
            isEdit={!!editingRecord}
          />
        </LocalizationProvider>
      </Paper>
    </motion.div>
  );
};

const EducationTable = () => {
  const dataProvider = useDataProvider();
  const invalidate = useInvalidate();
  const [openDialog, setOpenDialog] = React.useState(false);
  const [editingRecord, setEditingRecord] = React.useState<any>(null);
  const { dataGridProps } = useDataGrid({
    resource: "profile/education",
    pagination: { pageSize: 5 },
  });

  const columns: GridColDef[] = [
    { field: "institution", headerName: "Institution", flex: 1 },
    { field: "degree_diploma", headerName: "Degree", flex: 1 },
    { field: "grade_score", headerName: "Grade", width: 120 },
    {
      field: "graduation_date",
      headerName: "Graduated",
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
            setEditingRecord(params.row);
            setOpenDialog(true);
          }}
        />,
        <GridActionsCellItem
          key="delete"
          icon={<DeleteIcon />}
          label="Delete"
          onClick={async () => {
            try {
              await dataProvider().deleteOne({
                resource: "profile/education",
                id: params.id,
              });
              invalidate({
                resource: "profile/education",
                invalidates: ["list"]
              });
            } catch (error) {
              console.error("Delete failed:", error);
            }
          }}
        />,
      ],
    },
  ];

  const handleAddEducation = () => {
    setEditingRecord(null);
    setOpenDialog(true);
  };

  const handleEducationSubmit = async (data: any) => {
    try {
      if (editingRecord) {
        // Update existing record
        await dataProvider().update({
          resource: "profile/education",
          id: editingRecord.id,
          variables: data,
        });
        
        // Refresh data grid
        invalidate({
          resource: "profile/education",
          invalidates: ["list"]
        });
      } else {
        // Create new record
        await dataProvider().create({
          resource: "profile/education",
          variables: data,
        });
        
        // Refresh data grid
        invalidate({
          resource: "profile/education",
          invalidates: ["list"]
        });
      }
      
      // Refresh data grid
      invalidate({
        resource: "profile/education",
        invalidates: ["list"]
      });
      
      setOpenDialog(false);
    } catch (error) {
      console.error("Error saving education record:", error);
    }
  };


  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Paper elevation={1} sx={{ p: 2, borderRadius: 3 }}>
        <Button startIcon={<AddIcon />} variant="contained" sx={{ mb: 2 }} onClick={handleAddEducation}>
          Add Education
        </Button>
        <DataGrid
          {...dataGridProps}
          columns={columns}
          autoHeight
          density="comfortable"
          disableRowSelectionOnClick
        />
        
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <EducationForm
            open={openDialog}
            onClose={() => setOpenDialog(false)}
            onSubmit={handleEducationSubmit}
            initialData={editingRecord}
            isEdit={!!editingRecord}
          />
        </LocalizationProvider>
      </Paper>
    </motion.div>
  );
};

const ReferencesTable = () => {
  const dataProvider = useDataProvider();
  const invalidate = useInvalidate();
  const [openDialog, setOpenDialog] = React.useState(false);
  const [editingRecord, setEditingRecord] = React.useState<any>(null);
  const { dataGridProps } = useDataGrid({
    resource: "profile/references",
    pagination: { pageSize: 5 },
  });

  const columns: GridColDef[] = [
    { field: "name", headerName: "Name", flex: 1 },
    { field: "position", headerName: "Job Title", flex: 1 },
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
            setEditingRecord(params.row);
            setOpenDialog(true);
          }}
        />,
        <GridActionsCellItem
          key="delete"
          icon={<DeleteIcon />}
          label="Delete"
          onClick={async () => {
            try {
              await dataProvider().deleteOne({
                resource: "profile/references",
                id: params.id,
              });
              invalidate({
                resource: "profile/references",
                invalidates: ["list"]
              });
            } catch (error) {
              console.error("Delete failed:", error);
            }
          }}
        />,
      ],
    },
  ];

  const handleAddReference = () => {
    setEditingRecord(null);
    setOpenDialog(true);
  };

  const handleReferenceSubmit = async (data: any) => {
    try {
      if (editingRecord) {
        // Update existing record
        await dataProvider().update({
          resource: "profile/references",
          id: editingRecord.id,
          variables: data,
        });
        
        // Refresh data grid
        invalidate({
          resource: "profile/references",
          invalidates: ["list"]
        });
      } else {
        // Create new record
        await dataProvider().create({
          resource: "profile/references",
          variables: data,
        });
        
        // Refresh data grid
        invalidate({
          resource: "profile/references",
          invalidates: ["list"]
        });
      }
      
      setOpenDialog(false);
    } catch (error) {
      console.error("Error saving reference record:", error);
    }
  };


  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Paper elevation={1} sx={{ p: 2, borderRadius: 3 }}>
        <Button startIcon={<AddIcon />} variant="contained" sx={{ mb: 2 }} onClick={handleAddReference}>
          Add Reference
        </Button>
        <DataGrid
          {...dataGridProps}
          columns={columns}
          autoHeight
          density="comfortable"
          disableRowSelectionOnClick
        />
        
        <ReferenceForm
          open={openDialog}
          onClose={() => setOpenDialog(false)}
          onSubmit={handleReferenceSubmit}
          initialData={editingRecord}
          isEdit={!!editingRecord}
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
    id: "me", // We use a special ID since profile is user-specific
  });

  // Initialize form with default values and loaded data
  const methods = useForm({ 
    defaultValues: { 
      forename: '', 
      surname: '', 
      mobile_phone: '',
      address_line_1: '',
      address_line_2: '',
      city: '',
      county: '',
      country: '',
      postcode: '',
      dob: null as Date | null, 
      avatar: null 
    },
    values: profileData?.data ? {
      forename: profileData.data.forename || '',
      surname: profileData.data.surname || '',
      mobile_phone: profileData.data.mobile_phone || '',
      address_line_1: profileData.data.address_line_1 || '',
      address_line_2: profileData.data.address_line_2 || '',
      city: profileData.data.city || '',
      county: profileData.data.county || '',
      country: profileData.data.country || '',
      postcode: profileData.data.postcode || '',
      dob: profileData.data.available_date ? new Date(profileData.data.available_date) : null,
      avatar: null
    } : undefined
  });

  const { register, setValue, control, handleSubmit } = methods;
  const dob = useWatch({ name: "dob", control });

  const dataProvider = useDataProvider();

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTab(newValue);
  };

  // Save profile data
  const onSubmit = async (data: any) => {
    setIsSaving(true);
    setSaveMessage(null);

    
        try {
          const profilePayload = {
            forename: data.forename,
            surname: data.surname,
            mobile_phone: data.mobile_phone,
            address_line_1: data.address_line_1,
            address_line_2: data.address_line_2,
            city: data.city,
            county: data.county,
            country: data.country,
            postcode: data.postcode,
            available_date: data.dob ? data.dob.toISOString() : null,
            // Include related data in the payload
            user_documents: [],
            user_skills: []
          };
      await dataProvider().update({
        resource: "profile",
        id: "me",
        variables: profilePayload,
      });

      setSaveMessage({ type: 'success', text: 'Profile saved successfully!' });
      refetch(); // Refresh the profile data
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
          onClick: handleSubmit(onSubmit),
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
                <Paper elevation={1} sx={{ p: 3, borderRadius: 3 }}>
                  <AvatarField />
                  
                  <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
                    <TextField 
                      {...register("forename")} 
                      label="Forename" 
                      fullWidth 
                      variant="outlined"
                    />
                    <TextField 
                      {...register("surname")} 
                      label="Surname" 
                      fullWidth 
                      variant="outlined"
                    />
                    <TextField 
                      {...register("mobile_phone")} 
                      label="Mobile Phone" 
                      fullWidth 
                      variant="outlined"
                      type="tel"
                    />
                    <LocalizationProvider dateAdapter={AdapterDateFns}>
                      <DatePicker
                        label="Date of Birth"
                        value={dob || null}
                        onChange={(date: Date | null) => setValue("dob", date)}
                        slotProps={{ textField: { fullWidth: true, variant: "outlined" } }}
                      />
                    </LocalizationProvider>
                  </Box>

                  <Divider sx={{ my: 3 }} />
                  
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    Address Information
                  </Typography>
                  
                  <Box sx={{ display: 'grid', gap: 2 }}>
                    <TextField 
                      {...register("address_line_1")} 
                      label="Address Line 1" 
                      fullWidth 
                      variant="outlined"
                    />
                    <TextField 
                      {...register("address_line_2")} 
                      label="Address Line 2" 
                      fullWidth 
                      variant="outlined"
                    />
                    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' } }}>
                      <TextField 
                        {...register("city")} 
                        label="City" 
                        fullWidth 
                        variant="outlined"
                      />
                      <TextField 
                        {...register("county")} 
                        label="County" 
                        fullWidth 
                        variant="outlined"
                      />
                      <TextField 
                        {...register("postcode")} 
                        label="Postcode" 
                        fullWidth 
                        variant="outlined"
                      />
                    </Box>
                    <TextField 
                      {...register("country")} 
                      label="Country" 
                      fullWidth 
                      variant="outlined"
                      placeholder="e.g., United Kingdom"
                    />
                  </Box>

                  {/* Save Button for Personal Tab */}
                  <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      variant="contained"
                      startIcon={isSaving ? <CircularProgress size={20} /> : <SaveIcon />}
                      onClick={handleSubmit(onSubmit)}
                      disabled={isSaving}
                      size="large"
                    >
                      {isSaving ? 'Saving...' : 'Save Personal Information'}
                    </Button>
                  </Box>
                </Paper>
              </TabPanel>
              
              <TabPanel value={tab} index={1} key={1}>
                <EmploymentTable />
              </TabPanel>
              
              <TabPanel value={tab} index={2} key={2}>
                <EducationTable />
              </TabPanel>
              
              <TabPanel value={tab} index={3} key={3}>
                <ReferencesTable />
              </TabPanel>
            </AnimatePresence>
          </Box>
        </motion.div>
      </Edit>
    </FormProvider>
  );
};
