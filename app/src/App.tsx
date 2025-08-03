import {
  Refine,
  GitHubBanner,
  WelcomePage,
  Authenticated,
} from "@refinedev/core";
import { DevtoolsPanel, DevtoolsProvider } from "@refinedev/devtools";
import { RefineKbar, RefineKbarProvider } from "@refinedev/kbar";

import {
  AuthPage,
  ErrorComponent,
  useNotificationProvider,
  RefineSnackbarProvider,
  ThemedLayoutV2,
} from "@refinedev/mui";

import CssBaseline from "@mui/material/CssBaseline";
import GlobalStyles from "@mui/material/GlobalStyles";
import { BrowserRouter, Route, Routes, Outlet } from "react-router";
import routerBindings, {
  NavigateToResource,
  CatchAllNavigate,
  UnsavedChangesNotifier,
  DocumentTitleHandler,
} from "@refinedev/react-router";
import { ColorModeContextProvider } from "./contexts/color-mode";
import { Header } from "./components/header";
import { dataProvider } from "./providers/dataProvider";
import { authProvider } from "./providers/authProvider";

function App() {
  return (
    <BrowserRouter>
      <GitHubBanner />
      <RefineKbarProvider>
        <ColorModeContextProvider>
          <CssBaseline />
          <GlobalStyles styles={{ html: { WebkitFontSmoothing: "auto" } }} />
          <RefineSnackbarProvider>
            <DevtoolsProvider>
              <Refine
                dataProvider={dataProvider}
                authProvider={authProvider}
                notificationProvider={useNotificationProvider}
                routerProvider={routerBindings}
                resources={[
                  {
                    name: "dashboard",
                    list: "/dashboard",
                    meta: {
                      label: "Dashboard",
                      icon: "🎯",
                    },
                  },
                  {
                    name: "profile",
                    list: "/profile",
                    show: "/profile/:id",
                    edit: "/profile/:id/edit",
                    meta: {
                      label: "Profile",
                      icon: "👤",
                    },
                  },
                  {
                    name: "jobs",
                    list: "/jobs",
                    show: "/jobs/:id",
                    create: "/jobs/create",
                    edit: "/jobs/:id/edit",
                    meta: {
                      label: "Jobs",
                      icon: "💼",
                    },
                  },
                  {
                    name: "applications",
                    list: "/applications", 
                    show: "/applications/:id",
                    create: "/applications/create",
                    edit: "/applications/:id/edit",
                    meta: {
                      label: "Applications",
                      icon: "📄",
                    },
                  },
                ]}
                options={{
                  syncWithLocation: true,
                  warnWhenUnsavedChanges: true,
                  useNewQueryKeys: true,
                  projectId: "SJZBqG-vyb8v5-QQW29J",
                }}
              >
                <Routes>
                  <Route
                    element={
                      <Authenticated
                        key="authenticated-inner"
                        fallback={<CatchAllNavigate to="/login" />}
                      >
                        <ThemedLayoutV2 Header={() => <Header sticky />}>
                          <Outlet />
                        </ThemedLayoutV2>
                      </Authenticated>
                    }
                  >
                    <Route index element={<NavigateToResource resource="dashboard" />} />
                    <Route path="/dashboard" element={<WelcomePage />} />
                    {/* We'll add actual page components later */}
                  </Route>
                  <Route
                    element={
                      <Authenticated key="authenticated-outer" fallback={<Outlet />}>
                        <NavigateToResource />
                      </Authenticated>
                    }
                  >
                    <Route
                      path="/login"
                      element={
                        <AuthPage
                          type="login"
                          title="EZApply"
                          formProps={{
                            defaultValues: { email: "", password: "" },
                          }}
                        />
                      }
                    />
                    <Route
                      path="/register"
                      element={
                        <AuthPage
                          type="register"
                          title="EZApply"
                          formProps={{
                            defaultValues: { 
                              email: "", 
                              password: "", 
                              firstName: "", 
                              lastName: "" 
                            },
                          }}
                        />
                      }
                    />
                  </Route>
                  <Route
                    element={
                      <Authenticated key="catch-all">
                        <ThemedLayoutV2 Header={() => <Header sticky />}>
                          <Outlet />
                        </ThemedLayoutV2>
                      </Authenticated>
                    }
                  >
                    <Route path="*" element={<ErrorComponent />} />
                  </Route>
                </Routes>
                <RefineKbar />
                <UnsavedChangesNotifier />
                <DocumentTitleHandler />
              </Refine>
              <DevtoolsPanel />
            </DevtoolsProvider>
          </RefineSnackbarProvider>
        </ColorModeContextProvider>
      </RefineKbarProvider>
    </BrowserRouter>
  );
}

export default App;
