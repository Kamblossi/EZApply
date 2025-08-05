import { Edit, useDataGrid } from "@refinedev/mui";
import { useDataProvider, useInvalidate } from "@refinedev/core";
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
  // Removed unused Dialog imports
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
import { motion, AnimatePresence } from "framer-motion";
import { useForm, FormProvider, useWatch, useFormContext } from "react-hook-form";
import dayjs from "dayjs";
import React from "react";

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
  const { dataGridProps } = useDataGrid({
    resource: "profile/employment",
    pagination: { pageSize: 5 },
  });

  const columns: GridColDef[] = [
    { field: "organisation", headerName: "Organisation", flex: 1 },
    { field: "role", headerName: "Role/Title", flex: 1 },
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
      getActions: ({ id }) => [
        <GridActionsCellItem
          key="edit"
          icon={<EditIcon />}
          label="Edit"
          onClick={() => {/* TODO: Edit dialog */}}
        />,
        <GridActionsCellItem
          key="delete"
          icon={<DeleteIcon />}
          label="Delete"
          onClick={async () => {
            try {
              await dataProvider().deleteOne({
                resource: "profile/employment",
                id,
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

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Paper elevation={1} sx={{ p: 2, borderRadius: 3 }}>
        <Button startIcon={<AddIcon />} variant="contained" sx={{ mb: 2 }}>
          Add Employment
        </Button>
        <DataGrid
          {...dataGridProps}
          columns={columns}
          autoHeight
          density="comfortable"
          disableRowSelectionOnClick
        />
      </Paper>
    </motion.div>
  );
};

const EducationTable = () => {
  const dataProvider = useDataProvider();
  const invalidate = useInvalidate();
  const { dataGridProps } = useDataGrid({
    resource: "profile/education",
    pagination: { pageSize: 5 },
  });

  const columns: GridColDef[] = [
    { field: "institution", headerName: "Institution", flex: 1 },
    { field: "degree", headerName: "Degree", flex: 1 },
    { field: "grade", headerName: "Grade", width: 120 },
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
      getActions: ({ id }) => [
        <GridActionsCellItem
          key="edit"
          icon={<EditIcon />}
          label="Edit"
          onClick={() => {/* TODO: Edit dialog */}}
        />,
        <GridActionsCellItem
          key="delete"
          icon={<DeleteIcon />}
          label="Delete"
          onClick={async () => {
            try {
              await dataProvider().deleteOne({
                resource: "profile/education",
                id,
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

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Paper elevation={1} sx={{ p: 2, borderRadius: 3 }}>
        <Button startIcon={<AddIcon />} variant="contained" sx={{ mb: 2 }}>
          Add Education
        </Button>
        <DataGrid
          {...dataGridProps}
          columns={columns}
          autoHeight
          density="comfortable"
          disableRowSelectionOnClick
        />
      </Paper>
    </motion.div>
  );
};

const ReferencesTable = () => {
  const dataProvider = useDataProvider();
  const invalidate = useInvalidate();
  const { dataGridProps } = useDataGrid({
    resource: "profile/references",
    pagination: { pageSize: 5 },
  });

  const columns: GridColDef[] = [
    { field: "name", headerName: "Name", flex: 1 },
    { field: "job_title", headerName: "Job Title", flex: 1 },
    { field: "company", headerName: "Company", flex: 1 },
    { field: "email", headerName: "Email", flex: 1 },
    { field: "phone", headerName: "Phone", width: 150 },
    {
      type: "actions",
      field: "actions",
      headerName: "Actions",
      width: 120,
      getActions: ({ id }) => [
        <GridActionsCellItem
          key="edit"
          icon={<EditIcon />}
          label="Edit"
          onClick={() => {/* TODO: Edit dialog */}}
        />,
        <GridActionsCellItem
          key="delete"
          icon={<DeleteIcon />}
          label="Delete"
          onClick={async () => {
            try {
              await dataProvider().deleteOne({
                resource: "profile/references",
                id,
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

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Paper elevation={1} sx={{ p: 2, borderRadius: 3 }}>
        <Button startIcon={<AddIcon />} variant="contained" sx={{ mb: 2 }}>
          Add Reference
        </Button>
        <DataGrid
          {...dataGridProps}
          columns={columns}
          autoHeight
          density="comfortable"
          disableRowSelectionOnClick
        />
      </Paper>
    </motion.div>
  );
};

export const ProfileEdit = () => {
  const [tab, setTab] = React.useState(0);
  const methods = useForm({ defaultValues: { forename: '', surname: '', dob: null as Date | null, avatar: null } });
  const { register, setValue, control } = methods;
  const dob = useWatch({ name: "dob", control });

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTab(newValue);
  };

  return (
    <FormProvider {...methods}>
      <Edit title={<Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>My Profile</Typography>}>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
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
                <Paper elevation={1} sx={{ p: 2, borderRadius: 3 }}>
                  <AvatarField />
                  <TextField {...register("forename")} label="Forename" fullWidth sx={{ mb: 2 }} />
                  <TextField {...register("surname")} label="Surname" fullWidth sx={{ mb: 2 }} />
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DatePicker
                      label="Date of Birth"
                      value={dob || null}
                      onChange={(date: Date | null) => setValue("dob", date)}
                      slotProps={{ textField: { fullWidth: true, variant: "outlined", sx: { mb: 2 } } }}
                    />
                  </LocalizationProvider>
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
