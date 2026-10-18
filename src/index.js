import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import SignUp from './sign_up';
import Login from './login';
import CandidateProfile from './candidate_profile';
import CompanyProfile from './company_profile';
import CandidateSearch from './candidate_search';
import EmployerDashboard from './employer_dashboard';
import CreateJobListing from './create_job';
import EditJobListing from './edit_job';
import ApplicantsPage from './applicants_page';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/candidate-profile" element={<CandidateProfile />} />
        <Route path="/company-profile" element={<CompanyProfile />} />
        <Route path="/candidate-search" element={<CandidateSearch />} />
        <Route path="/employer-dashboard" element={<EmployerDashboard />} />
        <Route path="/jobs/new" element={<CreateJobListing />} />
        <Route path="/jobs/:jobId/edit" element={<EditJobListing />} />
        <Route path="/jobs/:jobId/applicants" element={<ApplicantsPage />} />
        <Route path="/" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);