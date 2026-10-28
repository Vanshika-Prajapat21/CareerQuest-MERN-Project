import { Routes, Route } from "react-router-dom";
import PublicLayout from "./components/PublicLayout";
import DashboardLayout from "./components/DashboardLayout";
import ProtectedRoute from "./components/ProtectedRoute";

import Home from "./pages/Home";
import Explore from "./pages/Explore";
import OpportunityDetails from "./pages/OpportunityDetails";
import ApplyForm from "./pages/ApplyForm";
import ApplicationDetails from "./pages/ApplicationDetails";
import About from "./pages/About";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";

import StudentDashboard from "./pages/student/StudentDashboard";
import Profile from "./pages/student/Profile";
import Recommended from "./pages/student/Recommended";
import Saved from "./pages/student/Saved";
import MyApplications from "./pages/student/MyApplications";
import Notifications from "./pages/student/Notifications";
import Settings from "./pages/student/Settings";
import MyCareerPortfolio from "./pages/student/MyCareerPortfolio";

import AdminDashboard from "./pages/admin/AdminDashboard";
import ManageOpportunities from "./pages/admin/ManageOpportunities";
import OpportunityForm from "./pages/admin/OpportunityForm";
import ManageUsers from "./pages/admin/ManageUsers";
import ManageCategories from "./pages/admin/ManageCategories";
import Reports from "./pages/admin/Reports";
import AdminApplications from "./pages/admin/AdminApplications";

export default function App() {
  return (
    <Routes>
      {/* Public pages: navbar on top, footer at bottom */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/opportunities/:id" element={<OpportunityDetails />} />
        <Route path="/opportunities/:id/apply" element={<ProtectedRoute role="student"><ApplyForm /></ProtectedRoute>} />
        <Route path="/about" element={<About />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* Student area: only role "student" may enter */}
      <Route path="/student" element={<ProtectedRoute role="student"><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<StudentDashboard />} />
        <Route path="recommended" element={<Recommended />} />
        <Route path="opportunities" element={<Explore />} />
        <Route path="saved" element={<Saved />} />
        <Route path="applications" element={<MyApplications />} />
        <Route path="applications/:id" element={<ApplicationDetails />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="profile" element={<Profile />} />
        <Route path="portfolio" element={<MyCareerPortfolio />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Admin area: only role "admin" may enter */}
      <Route path="/admin" element={<ProtectedRoute role="admin"><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="opportunities" element={<ManageOpportunities />} />
        <Route path="opportunities/new" element={<OpportunityForm />} />
        <Route path="opportunities/:id/edit" element={<OpportunityForm />} />
        <Route path="users" element={<ManageUsers />} />
        <Route path="categories" element={<ManageCategories />} />
        <Route path="reports" element={<Reports />} />
        <Route path="applications" element={<AdminApplications />} />
        <Route path="applications/:id" element={<ApplicationDetails admin />} />
      </Route>
    </Routes>
  );
}
