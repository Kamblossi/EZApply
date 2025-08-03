import { Refine, Authenticated, WelcomePage } from "@refinedev/core";
import { BrowserRouter, Route, Routes, Outlet } from "react-router-dom";
import routerBindings, { CatchAllNavigate, NavigateToResource } from "@refinedev/react-router";
import { dataProvider } from "./providers/dataProvider";
import { authProvider } from "./providers/authProvider";
import { Login } from "./pages/auth/Login";
import { Register } from "./pages/auth/Register";
import { VerifyEmail } from "./pages/auth/VerifyEmail";

function App() {
  return (
    <BrowserRouter>
      <Refine
        dataProvider={dataProvider}
        authProvider={authProvider}
        routerProvider={routerBindings}
        resources={[
          { name: "profile" },
          { name: "jobs" },
          { name: "applications" },
        ]}
      >
        <Routes>
          <Route
            element={
              <Authenticated fallback={<CatchAllNavigate to="/login" />}>
                <div style={{ padding: '20px' }}>
                  <h1>EZApply - Step 4: Authenticated Area</h1>
                  <Outlet />
                </div>
              </Authenticated>
            }
          >
            <Route index element={<NavigateToResource resource="profile" />} />
            <Route path="/profile" element={<WelcomePage />} />
            <Route path="/jobs" element={<WelcomePage />} />
            <Route path="/applications" element={<WelcomePage />} />
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
    </BrowserRouter>
  );
}

export default App;
