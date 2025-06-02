import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

/* lazy-loaded pages */
const ProjectDashboard = lazy(() => import("./modules/project/pages/Dashboard.jsx"));
const HelpPage         = lazy(() => import("./modules/help/Help.jsx"));
const ConfigPage       = lazy(() => import("./modules/config/Config.jsx"));

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Suspense fallback={<p style={{ padding: 20 }}>Loading…</p>}>
        <Routes>
          <Route path="/" element={<Navigate to="/config" />} />
          <Route path="/project/:projectId" element={<ProjectDashboard />} />
          <Route path="/config" element={<ConfigPage />} />
          <Route path="/help" element={<HelpPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
