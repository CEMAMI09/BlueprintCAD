'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Issue {
  id: number;
  user_id?: number;
  username?: string;
  email?: string;
  issue_type: string;
  severity: string;
  title: string;
  message: string;
  screenshot_path?: string;
  browser_info?: string;
  user_agent?: string;
  url?: string;
  status: string;
  assigned_to?: number;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  assigned_admin_username?: string;
}

export default function IssuesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('submit');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form state
  const [formData, setFormData] = useState({
    issue_type: 'bug',
    severity: 'medium',
    title: '',
    message: '',
    screenshot: null as File | null
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // My issues state
  const [myIssues, setMyIssues] = useState<Issue[]>([]);
  const [loadingIssues, setLoadingIssues] = useState(false);
  const [expandedIssue, setExpandedIssue] = useState<number | null>(null);

  // Admin panel state
  const [adminIssues, setAdminIssues] = useState<Issue[]>([]);
  const [loadingAdminIssues, setLoadingAdminIssues] = useState(false);
  const [adminFilters, setAdminFilters] = useState({
    status: '',
    severity: '',
    issue_type: ''
  });

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (activeTab === 'my-issues' && isAuthenticated) {
      loadMyIssues();
    } else if (activeTab === 'admin' && isAdmin) {
      loadAdminIssues();
    }
  }, [activeTab, isAuthenticated, isAdmin]);

  const checkAuth = () => {
    const userData = localStorage.getItem('user');
    
    if (userData) {
      const user = JSON.parse(userData);
      setIsAuthenticated(true);
      setIsAdmin(user.isAdmin || false);
    }
    
    setLoading(false);
  };

  const loadMyIssues = async () => {
    setLoadingIssues(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/issues/list`);
      if (response.ok) {
        const data = await response.json();
        setMyIssues(data.issues || []);
      }
    } catch (error) {
      console.error('Failed to load issues:', error);
    } finally {
      setLoadingIssues(false);
    }
  };

  const loadAdminIssues = async () => {
    setLoadingAdminIssues(true);
    try {
      const queryParams = new URLSearchParams();
      if (adminFilters.status) queryParams.append('status', adminFilters.status);
      if (adminFilters.severity) queryParams.append('severity', adminFilters.severity);
      if (adminFilters.issue_type) queryParams.append('issue_type', adminFilters.issue_type);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/issues/list?${queryParams.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setAdminIssues(data.issues || []);
      }
    } catch (error) {
      console.error('Failed to load admin issues:', error);
    } finally {
      setLoadingAdminIssues(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      e.target.value = '';
      return;
    }
    setFormData(prev => ({ ...prev, screenshot: file || null }));
  };

  const getBrowserInfo = () => {
    return JSON.stringify({
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      screen: `${screen.width}x${screen.height}`,
      viewport: `${window.innerWidth}x${window.innerHeight}`
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitSuccess(false);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('issue_type', formData.issue_type);
      formDataToSend.append('severity', formData.severity);
      formDataToSend.append('title', formData.title);
      formDataToSend.append('message', formData.message);
      formDataToSend.append('browser_info', getBrowserInfo());
      formDataToSend.append('url', window.location.href);
      
      if (formData.screenshot) {
        formDataToSend.append('screenshot', formData.screenshot);
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/issues/submit`, {
        method: 'POST',
        body: formDataToSend
      });

      if (response.ok) {
        setSubmitSuccess(true);
        setFormData({
          issue_type: 'bug',
          severity: 'medium',
          title: '',
          message: '',
          screenshot: null
        });
        // Reset file input
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        
        // Switch to my issues tab after 2 seconds
        setTimeout(() => {
          setActiveTab('my-issues');
          loadMyIssues();
        }, 2000);
      } else {
        const data = await response.json();
        alert(`Failed to submit issue: ${data.error}`);
      }
    } catch (error) {
      console.error('Submit error:', error);
      alert('Failed to submit issue. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const updateIssueStatus = async (issueId: number, status: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/issues/${issueId}/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        loadAdminIssues();
      } else {
        alert('Failed to update issue status');
      }
    } catch (error) {
      console.error('Update error:', error);
      alert('Failed to update issue');
    }
  };

  const assignIssue = async (issueId: number, adminId: number | null) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/issues/${issueId}/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigned_to: adminId || null })
      });

      if (response.ok) {
        loadAdminIssues();
      } else {
        alert('Failed to assign issue');
      }
    } catch (error) {
      console.error('Assign error:', error);
      alert('Failed to assign issue');
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-red-100 text-red-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityBadgeColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-600 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-white';
      case 'low': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8 text-white">Issue Reporting</h1>

        {/* Tabs */}
        <div className="flex space-x-1 mb-6 border-b border-gray-700">
          <button
            onClick={() => setActiveTab('submit')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'submit'
                ? 'border-b-2 border-blue-500 text-blue-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Submit Issue
          </button>
          
          {isAuthenticated && (
            <button
              onClick={() => setActiveTab('my-issues')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'my-issues'
                  ? 'border-b-2 border-blue-500 text-blue-400'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              My Issues
            </button>
          )}
          
          {isAdmin && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'admin'
                  ? 'border-b-2 border-blue-500 text-blue-400'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Admin Panel
            </button>
          )}
        </div>

        {/* Submit Form */}
        {activeTab === 'submit' && (
          <div className="bg-gray-800 rounded-lg shadow-xl p-6 max-w-3xl">
            {submitSuccess && (
              <div className="mb-6 p-4 bg-green-900 border border-green-700 rounded-lg">
                <p className="text-green-300 font-medium">✅ Issue submitted successfully!</p>
                <p className="text-green-400 text-sm mt-1">Redirecting to your issues...</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Issue Type *
                  </label>
                  <select
                    name="issue_type"
                    value={formData.issue_type}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="bug">Bug Report</option>
                    <option value="feature">Feature Request</option>
                    <option value="question">Question</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Severity *
                  </label>
                  <select
                    name="severity"
                    value={formData.severity}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Title * <span className="text-gray-500 text-xs">(max 200 characters)</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  maxLength={200}
                  placeholder="Brief description of the issue"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-gray-200 placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description * <span className="text-gray-500 text-xs">(max 5000 characters)</span>
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  required
                  maxLength={5000}
                  rows={6}
                  placeholder="Detailed description of the issue..."
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-gray-200 placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Screenshot (optional) <span className="text-gray-500 text-xs">(max 5MB, jpg/png)</span>
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="bg-gray-700 p-4 rounded-lg">
                <p className="text-sm text-gray-300">
                  <strong>Auto-captured info:</strong> Browser details and current page URL will be automatically included.
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'Submitting...' : 'Submit Issue'}
              </button>
            </form>
          </div>
        )}

        {/* My Issues */}
        {activeTab === 'my-issues' && isAuthenticated && (
          <div className="space-y-4">
            {loadingIssues ? (
              <div className="text-center py-8">Loading your issues...</div>
            ) : myIssues.length === 0 ? (
              <div className="bg-gray-800 rounded-lg shadow-xl p-8 text-center">
                <p className="text-gray-400">You haven't submitted any issues yet.</p>
                <button
                  onClick={() => setActiveTab('submit')}
                  className="mt-4 text-blue-400 hover:underline"
                >
                  Submit your first issue →
                </button>
              </div>
            ) : (
              myIssues.map((issue) => (
                <div key={issue.id} className="bg-gray-800 rounded-lg shadow-xl p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(issue.status)}`}>
                          {issue.status.replace('_', ' ').toUpperCase()}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getSeverityBadgeColor(issue.severity)}`}>
                          {issue.severity.toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-500">
                          {issue.issue_type.toUpperCase()}
                        </span>
                      </div>
                      
                      <h3 className="text-lg font-semibold mb-2 text-white">{issue.title}</h3>
                      
                      <button
                        onClick={() => setExpandedIssue(expandedIssue === issue.id ? null : issue.id)}
                        className="text-sm text-blue-400 hover:underline mb-2"
                      >
                        {expandedIssue === issue.id ? 'Hide details' : 'Show details'}
                      </button>
                      
                      {expandedIssue === issue.id && (
                        <div className="mt-4 space-y-3">
                          <div className="bg-gray-700 p-4 rounded-lg">
                            <p className="text-gray-200 whitespace-pre-wrap">{issue.message}</p>
                          </div>
                          
                          {issue.screenshot_path && (
                            <div>
                              <p className="text-sm font-medium text-gray-300 mb-2">Screenshot:</p>
                              <img 
                                src={issue.screenshot_path} 
                                alt="Issue screenshot" 
                                className="max-w-md rounded-lg border"
                              />
                            </div>
                          )}
                          
                          {issue.admin_notes && (
                            <div className="bg-blue-900 p-4 rounded-lg">
                              <p className="text-sm font-medium text-blue-200 mb-1">Admin Notes:</p>
                              <p className="text-blue-300">{issue.admin_notes}</p>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <p className="text-xs text-gray-400 mt-2">
                        Submitted: {new Date(issue.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Admin Panel */}
        {activeTab === 'admin' && isAdmin && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-gray-800 rounded-lg shadow-xl p-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                  <select
                    value={adminFilters.status}
                    onChange={(e) => {
                      setAdminFilters(prev => ({ ...prev, status: e.target.value }));
                      setTimeout(loadAdminIssues, 100);
                    }}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-gray-200 rounded-lg"
                  >
                    <option value="">All Statuses</option>
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Severity</label>
                  <select
                    value={adminFilters.severity}
                    onChange={(e) => {
                      setAdminFilters(prev => ({ ...prev, severity: e.target.value }));
                      setTimeout(loadAdminIssues, 100);
                    }}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-gray-200 rounded-lg"
                  >
                    <option value="">All Severities</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
                  <select
                    value={adminFilters.issue_type}
                    onChange={(e) => {
                      setAdminFilters(prev => ({ ...prev, issue_type: e.target.value }));
                      setTimeout(loadAdminIssues, 100);
                    }}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-gray-200 rounded-lg"
                  >
                    <option value="">All Types</option>
                    <option value="bug">Bug</option>
                    <option value="feature">Feature</option>
                    <option value="question">Question</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Issues List */}
            <div className="space-y-4">
              {loadingAdminIssues ? (
                <div className="text-center py-8">Loading issues...</div>
              ) : adminIssues.length === 0 ? (
                <div className="bg-gray-800 rounded-lg shadow-xl p-8 text-center">
                  <p className="text-gray-400">No issues found with current filters.</p>
                </div>
              ) : (
                adminIssues.map((issue) => (
                  <div key={issue.id} className="bg-gray-800 rounded-lg shadow-xl p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getSeverityBadgeColor(issue.severity)}`}>
                            {issue.severity.toUpperCase()}
                          </span>
                          <span className="text-xs text-gray-500">
                            {issue.issue_type.toUpperCase()}
                          </span>
                          <span className="text-xs text-gray-500">
                            ID: {issue.id}
                          </span>
                        </div>
                        
                        <h3 className="text-lg font-semibold mb-2 text-white">{issue.title}</h3>
                        <p className="text-sm text-gray-400 mb-2">
                          By: {issue.username || issue.email || 'Anonymous'}
                        </p>
                        <p className="text-gray-200 whitespace-pre-wrap bg-gray-700 p-3 rounded">
                          {issue.message}
                        </p>
                        
                        {issue.screenshot_path && (
                          <div className="mt-3">
                            <img 
                              src={issue.screenshot_path} 
                              alt="Issue screenshot" 
                              className="max-w-sm rounded-lg border cursor-pointer hover:opacity-80"
                              onClick={() => window.open(issue.screenshot_path, '_blank')}
                            />
                          </div>
                        )}
                        
                        <p className="text-xs text-gray-400 mt-3">
                          Submitted: {new Date(issue.created_at).toLocaleString()}
                        </p>
                      </div>
                      
                      <div className="ml-6 space-y-3 min-w-[200px]">
                        <div>
                          <label className="block text-xs font-medium text-gray-300 mb-1">Status</label>
                          <select
                            value={issue.status}
                            onChange={(e) => updateIssueStatus(issue.id, e.target.value)}
                            className={`w-full px-2 py-1 border rounded text-sm ${getStatusBadgeColor(issue.status)}`}
                          >
                            <option value="open">Open</option>
                            <option value="in_progress">In Progress</option>
                            <option value="resolved">Resolved</option>
                            <option value="closed">Closed</option>
                          </select>
                        </div>
                        
                        {issue.admin_notes && (
                          <div className="bg-blue-900 p-2 rounded text-xs">
                            <p className="font-medium text-blue-200 mb-1">Notes:</p>
                            <p className="text-blue-300">{issue.admin_notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
