import { Refine, Authenticated } from "@refinedev/core";
import { BrowserRouter, Route, Routes, Outlet } from "react-router-dom";
import routerBindings, { CatchAllNavigate, NavigateToResource } from "@refinedev/react-router";
import { ThemeProvider } from "@mui/material/styles";
import { dataProvider } from "./providers/dataProvider";
import { authProvider } from "./providers/authProvider";
import { ezTheme } from "./theme";
import { Login } from "./pages/auth/Login";
import { Register } from "./pages/auth/Register";
import { VerifyEmail } from "./pages/auth/VerifyEmail";
import { ProfileEdit } from "./pages/auth/ProfileEdit";
import { JobsList } from "./pages/jobs/JobsList";
import { Dashboard } from "./pages/dashboard/Dashboard";
import { ApplicationsList } from "./pages/applications/ApplicationsList";
import { ApplicationWizard } from "./pages/applications/ApplicationWizard";
import { Settings } from "./pages/settings/Settings";
import { NavigationTabs } from "./components/NavigationTabs";

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider theme={ezTheme}>
        <Refine
          dataProvider={dataProvider}
          authProvider={authProvider}
          routerProvider={routerBindings}
          resources={[
            { name: "profile", list: "/profile", edit: "/profile/edit", show: "/profile/show" },
            { name: "jobs", list: "/jobs" },
            { name: "applications", list: "/applications" },
            { name: "settings", list: "/settings" },
          ]}
        >
        <Routes>
          <Route
            element={
              <Authenticated key="authenticated-inner" fallback={<CatchAllNavigate to="/login" />}> 
                <div style={{ padding: '20px' }}>
                  <NavigationTabs />
                  <Outlet />
                </div>
              </Authenticated>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="/profile" element={<ProfileEdit />} />
            <Route path="/profile/edit" element={<ProfileEdit />} />
            <Route path="/jobs" element={<JobsList />} />
            <Route path="/applications" element={<ApplicationsList />} />
            <Route path="/applications/new" element={<ApplicationWizard />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          <Route
            element={
              <Authenticated key="authenticated-outer" fallback={<Outlet />}> 
                <NavigateToResource />
              </Authenticated>
            }
          >
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
          </Route>
        </Routes>
        </Refine>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
