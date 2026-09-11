import { Routes, Route, Navigate, useParams } from 'react-router-dom';

function LegacyJobRedirect() {
  const { jobId } = useParams();
  return <Navigate to={`/candidate/jobs/${jobId}`} replace />;
}

import CandidateLayout from '../layouts/CandidateLayout.jsx';
import TALayout from '../layouts/TALayout.jsx';
import RoleRoute from '../components/routing/RoleRoute.jsx';

import LoginPage from '../pages/LoginPage.jsx';

import LandingPage from '../pages/candidate/LandingPage.jsx';
import JobsPage from '../pages/candidate/JobsPage.jsx';
import JobDetailsPage from '../pages/candidate/JobDetailsPage.jsx';
import ApplyPage from '../pages/candidate/ApplyPage.jsx';
import ApplicationSuccessPage from '../pages/candidate/ApplicationSuccessPage.jsx';
import MyApplicationPage from '../pages/candidate/MyApplicationPage.jsx';
import CandidateProfilePage from '../pages/candidate/CandidateProfilePage.jsx';

import TADashboard from '../pages/talentAcquisition/TADashboard.jsx';
import TACandidatesPage from '../pages/talentAcquisition/TACandidatesPage.jsx';
import TACandidateDetailPage from '../pages/talentAcquisition/TACandidateDetailPage.jsx';
import TAInterviewsPage from '../pages/talentAcquisition/TAInterviewsPage.jsx';
import TADocumentsPage from '../pages/talentAcquisition/TADocumentsPage.jsx';
import TAOffersPage from '../pages/talentAcquisition/TAOffersPage.jsx';
import TAJobsPage from '../pages/talentAcquisition/TAJobsPage.jsx';
import TAJobDetailPage from '../pages/talentAcquisition/TAJobDetailPage.jsx';
import TAActivityPage from '../pages/talentAcquisition/TAActivityPage.jsx';

import SettingsPage from '../pages/shared/SettingsPage.jsx';
import ProfilePage from '../pages/shared/ProfilePage.jsx';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/login" element={<Navigate to="/" replace />} />

      {/* Candidate / public */}
      <Route element={<CandidateLayout />}>
        <Route path="/candidate" element={<LandingPage />} />
        <Route path="/candidate/jobs" element={<JobsPage />} />
        <Route path="/candidate/jobs/:jobId" element={<JobDetailsPage />} />
        <Route path="/candidate/apply" element={<ApplyPage />} />
        <Route path="/candidate/apply/:jobId" element={<ApplyPage />} />
        <Route path="/candidate/application" element={<MyApplicationPage />} />
        <Route path="/candidate/application/success" element={<ApplicationSuccessPage />} />
        <Route path="/candidate/profile" element={<CandidateProfilePage />} />

        {/* legacy redirects */}
        <Route path="/jobs" element={<Navigate to="/candidate/jobs" replace />} />
        <Route path="/jobs/:jobId" element={<LegacyJobRedirect />} />
        <Route path="/apply" element={<Navigate to="/candidate/apply" replace />} />
        <Route path="/how-it-works" element={<Navigate to="/candidate" replace />} />
        <Route path="/application-success" element={<Navigate to="/candidate/application/success" replace />} />
        <Route path="/my-application" element={<Navigate to="/candidate/application" replace />} />
      </Route>

      {/* Talent Acquisition */}
      <Route
        element={
          <RoleRoute allow="ta">
            <TALayout />
          </RoleRoute>
        }
      >
        <Route path="/ta" element={<TADashboard />} />
        <Route path="/ta/applications" element={<Navigate to="/ta/candidates" replace />} />
        <Route path="/ta/candidates" element={<TACandidatesPage />} />
        <Route path="/ta/candidates/:candidateId" element={<TACandidateDetailPage />} />
        <Route path="/ta/interviews" element={<TAInterviewsPage />} />
        <Route path="/ta/documents" element={<TADocumentsPage />} />
        <Route path="/ta/offers" element={<TAOffersPage />} />
        <Route path="/ta/jobs" element={<TAJobsPage />} />
        <Route path="/ta/jobs/:jobId" element={<TAJobDetailPage />} />
        <Route path="/ta/activity" element={<TAActivityPage />} />
        <Route path="/ta/settings" element={<SettingsPage />} />
        <Route path="/ta/profile" element={<ProfilePage role="ta" />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
