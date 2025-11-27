/**
 * Folder Detail Page
 * Shows folder contents, subfolders, and projects
 */

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import CreateFolderModal from '@/components/CreateFolderModal';
import {
  ThreePanelLayout,
  LeftPanel,
  CenterPanel,
  RightPanel,
  PanelHeader,
  PanelContent,
} from '@/components/ui/ThreePanelLayout';
import { GlobalNavSidebar } from '@/components/ui/GlobalNavSidebar';
import { Button, Card, Badge, SearchBar, EmptyState } from '@/components/ui/UIComponents';
import { DesignSystem as DS } from '@/backend/lib/ui/design-system';
import {
  Folder,
  FileText,
  Plus,
  MoreVertical,
  Star,
  Download,
  Share2,
  Users,
  Clock,
  GitBranch,
  User,
  Eye,
  Lock,
  Globe,
  ArrowLeft,
  Trash2,
  MessageSquare,
  X,
  Settings,
} from 'lucide-react';
import BranchManagementModal from '@/frontend/components/BranchManagementModal';
import { Textarea } from '@/components/ui/UIComponents';
import ActivityPanel from '@/frontend/components/ActivityPanel';

interface FolderData {
  id: number;
  name: string;
  description: string;
  owner_id: number;
  owner_username: string;
  parent_id: number | null;
  is_team_folder: number;
  color: string;
  created_at: string;
  updated_at: string;
  project_count: number;
  member_count: number;
  user_role: string;
}

interface Project {
  id: number;
  title: string;
  description: string;
  file_path: string;
  file_type: string;
  views: number;
  likes: number;
  created_at: string;
  updated_at: string;
  username: string;
  thumbnail_path: string | null;
}

interface FolderItem {
  id: number;
  name: string;
  description: string;
  owner_id: number;
  owner_username: string;
  parent_id: number | null;
  is_team_folder: number;
  color: string;
  created_at: string;
  updated_at: string;
  project_count: number;
  member_count: number;
}

export default function FolderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [folder, setFolder] = useState<FolderData | null>(null);
  const [subfolders, setSubfolders] = useState<FolderItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [breadcrumb, setBreadcrumb] = useState<Array<{ id: number; name: string }>>([]);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [selectedProjectForBranches, setSelectedProjectForBranches] = useState<{ id: number; folder_id: number } | null>(null);
  const [projectMenuOpen, setProjectMenuOpen] = useState<number | null>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');
  const [activeTab, setActiveTab] = useState<'info' | 'notes' | 'members' | 'activity'>('info');
  const [submittingNote, setSubmittingNote] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'viewer' | 'editor' | 'admin'>('editor');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [newRole, setNewRole] = useState<'viewer' | 'editor' | 'admin' | 'owner'>('viewer');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [updatingRole, setUpdatingRole] = useState(false);

  useEffect(() => {
    if (id) {
      fetchFolderData();
      fetchBreadcrumb();
      fetchNotes();
    }
  }, [id]);

  useEffect(() => {
    if (folder?.is_team_folder === 1 && activeTab === 'members') {
      fetchMembers();
    }
  }, [folder?.id, folder?.is_team_folder, activeTab]);

  const fetchFolderData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`/api/folders/${id}`, { headers });
      if (res.ok) {
        const data = await res.json();
        // API returns folder data with projects and subfolders as properties
        const { projects: folderProjects, subfolders: folderSubfolders, ...folderData } = data;
        setFolder(folderData as FolderData);
        setSubfolders(folderSubfolders || []);
        setProjects(folderProjects || []);
      } else if (res.status === 404) {
        // Folder not found
        setFolder(null);
      }
    } catch (error) {
      console.error('Error fetching folder:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBreadcrumb = async () => {
    try {
      const res = await fetch(`/api/folders/${id}/breadcrumb`);
      if (res.ok) {
        const path = await res.json();
        setBreadcrumb(path || []);
      }
    } catch (error) {
      console.error('Error fetching breadcrumb:', error);
    }
  };

  const fetchNotes = async () => {
    if (!id) return;
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(`/api/folders/${id}/notes?folder_only=true`, { headers });
      if (res.ok) {
        const data = await res.json();
        setNotes(data.notes || []);
      }
    } catch (error) {
      console.error('Error fetching notes:', error);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !id || submittingNote) return;

    setSubmittingNote(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/folders/${id}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          note_text: newNote.trim()
        })
      });

      if (res.ok) {
        setNewNote('');
        await fetchNotes();
      }
    } catch (error) {
      console.error('Error adding note:', error);
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: number) => {
    if (!id) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/folders/${id}/notes?note_id=${noteId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        await fetchNotes();
      }
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  const fetchMembers = async () => {
    if (!id) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/folders/${id}/members`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setMembers(data);
      }
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const searchUsers = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        // Filter out users who are already members
        const memberUserIds = new Set(members.map((m: any) => m.user_id));
        const filtered = data.filter((user: any) => !memberUserIds.has(user.id));
        setSearchResults(filtered);
      }
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleInviteClick = (user: any) => {
    setSelectedUser(user);
    setSelectedRole('editor'); // Reset to default
    setShowInviteModal(true);
  };

  const handleInviteMember = async () => {
    if (!id || !selectedUser) return;

    setInviting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/folders/${id}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ username: selectedUser.username, role: selectedRole })
      });

      if (res.ok) {
        setMemberSearchQuery('');
        setSearchResults([]);
        setShowInviteModal(false);
        setSelectedUser(null);
        await fetchMembers();
        await fetchFolderData(); // Refresh folder data to update member count
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to invite member');
      }
    } catch (error) {
      console.error('Error inviting member:', error);
      alert('Failed to invite member. Please try again.');
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: number) => {
    if (!id || !confirm('Are you sure you want to remove this member?')) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/folders/${id}/members`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ memberId })
      });

      if (res.ok) {
        await fetchMembers();
        await fetchFolderData(); // Refresh folder data to update member count
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to remove member');
      }
    } catch (error) {
      console.error('Error removing member:', error);
      alert('Failed to remove member. Please try again.');
    }
  };

  const handleRoleClick = (member: any) => {
    // Get current user to check if trying to change own role
    const user = localStorage.getItem('user');
    const currentUserId = user ? JSON.parse(user).id : null;
    
    // Don't allow changing own role
    if (currentUserId && member.user_id === currentUserId) {
      alert('You cannot change your own role');
      return;
    }

    setSelectedMember(member);
    setNewRole(member.role);
    setShowRoleModal(true);
  };

  const handleRoleChange = async () => {
    if (!id || !selectedMember) return;

    // Don't allow changing to the same role
    if (newRole === selectedMember.role) {
      return;
    }

    // If transferring ownership, show confirmation
    if (newRole === 'owner' && selectedMember.role !== 'owner') {
      setShowConfirmDialog(true);
      return;
    }

    // For regular role changes, proceed directly
    await updateMemberRole();
  };

  const updateMemberRole = async () => {
    if (!id || !selectedMember) return;

    setUpdatingRole(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/folders/${id}/members/${selectedMember.id}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });

      if (res.ok) {
        setShowRoleModal(false);
        setShowConfirmDialog(false);
        setSelectedMember(null);
        await fetchMembers();
        await fetchFolderData(); // Refresh folder data
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to update role');
      }
    } catch (error) {
      console.error('Error updating role:', error);
      alert('Failed to update role. Please try again.');
    } finally {
      setUpdatingRole(false);
    }
  };

  const handleCreateFolder = async (folderData: any) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ...folderData, parent_id: Number(id) })
      });
      if (res.ok) {
        await fetchFolderData();
        setShowNewFolderModal(false);
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to create folder');
      }
    } catch (error) {
      console.error('Failed to create folder:', error);
      alert('Failed to create folder. Please try again.');
    }
  };

  const formatTimeAgo = (dateString: string) => {
    if (!dateString) return 'Just now';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
    if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
    return date.toLocaleDateString();
  };

  const filteredSubfolders = subfolders.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredProjects = projects.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return (
      <ThreePanelLayout
        leftPanel={<LeftPanel><GlobalNavSidebar /></LeftPanel>}
        centerPanel={
          <CenterPanel>
            <PanelContent>
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
              </div>
            </PanelContent>
          </CenterPanel>
        }
      />
    );
  }

  if (!folder) {
    return (
      <ThreePanelLayout
        leftPanel={<LeftPanel><GlobalNavSidebar /></LeftPanel>}
        centerPanel={
          <CenterPanel>
            <PanelContent>
              <div className="text-center py-12">
                <h1 className="text-2xl font-bold mb-4" style={{ color: DS.colors.text.primary }}>
                  Folder Not Found
                </h1>
                <Link href="/folders" style={{ color: DS.colors.primary.blue }}>
                  Back to Folders
                </Link>
              </div>
            </PanelContent>
          </CenterPanel>
        }
      />
    );
  }

  return (
    <>
      <ThreePanelLayout
        leftPanel={<LeftPanel><GlobalNavSidebar /></LeftPanel>}
        centerPanel={
          <CenterPanel>
            <PanelHeader
              title={
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<ArrowLeft size={18} />}
                    onClick={() => router.push('/folders')}
                  />
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${folder.color || DS.colors.primary.blue}22` }}
                  >
                    <Folder
                      size={20}
                      style={{ color: folder.color || DS.colors.primary.blue }}
                    />
                  </div>
                  <span>{folder.name}</span>
                </div>
              }
              actions={
                <div className="flex items-center gap-2">
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    icon={<Plus size={16} />} 
                    onClick={() => setShowNewFolderModal(true)}
                  >
                    New Folder
                  </Button>
                  <Button 
                    variant="primary" 
                    size="sm" 
                    icon={<Plus size={16} />} 
                    onClick={() => router.push(`/upload?folder=${id}`)}
                  >
                    Upload File
                  </Button>
                </div>
              }
            />
            <PanelContent>
              <div 
                className="max-w-7xl mx-auto px-6 py-6 min-h-full"
                onContextMenu={(e) => {
                  // Only show context menu if clicking on empty space, not on items
                  const target = e.target as HTMLElement;
                  if (!target.closest('[data-folder-item]') && !target.closest('[data-project-item]')) {
                    e.preventDefault();
                    setContextMenu({ x: e.clientX, y: e.clientY });
                  }
                }}
              >
                {/* Folder Path - More Prominent */}
                <Card padding="md" className="mb-6">
                  <div className="flex items-center gap-2 text-sm">
                    <span style={{ color: DS.colors.text.tertiary }}>Path:</span>
                    <Link 
                      href="/folders" 
                      className="hover:underline font-medium" 
                      style={{ color: DS.colors.primary.blue }}
                    >
                      My Projects
                    </Link>
                    {breadcrumb.length > 0 && <span style={{ color: DS.colors.text.tertiary }}>/</span>}
                    {breadcrumb.map((crumb, index) => (
                      <div key={crumb.id} className="flex items-center gap-2">
                        <Link
                          href={`/folders/${crumb.id}`}
                          className="hover:underline font-medium"
                          style={{ color: DS.colors.primary.blue }}
                        >
                          {crumb.name}
                        </Link>
                        {index < breadcrumb.length - 1 && (
                          <span style={{ color: DS.colors.text.tertiary }}>/</span>
                        )}
                      </div>
                    ))}
                    <span style={{ color: DS.colors.text.tertiary }}>/</span>
                    <span className="font-semibold" style={{ color: DS.colors.text.primary }}>
                      {folder.name}
                    </span>
                  </div>
                </Card>

                {/* Folder Description */}
                {folder.description && (
                  <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: DS.colors.background.panel }}>
                    <p className="text-sm" style={{ color: DS.colors.text.secondary }}>
                      {folder.description}
                    </p>
                  </div>
                )}

                {/* Search */}
                <div className="mb-6">
                  <SearchBar
                    placeholder="Search files and folders..."
                    onSearch={setSearchQuery}
                    fullWidth
                  />
                </div>

                {/* Subfolders */}
                {filteredSubfolders.length > 0 && (
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold mb-4" style={{ color: DS.colors.text.primary }}>
                      Folders
                    </h2>
                    <div className="space-y-2">
                      {filteredSubfolders.map((subfolder) => (
                        <div
                          key={subfolder.id}
                          data-folder-item
                          className="flex items-center gap-4 p-4 rounded-lg border transition-all cursor-pointer hover:shadow-lg"
                          style={{
                            backgroundColor: DS.colors.background.card,
                            borderColor: DS.colors.border.default,
                          }}
                          onClick={() => router.push(`/folders/${subfolder.id}`)}
                          onContextMenu={(e) => {
                            // Prevent context menu on folders - they navigate on click
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                        >
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: `${subfolder.color || DS.colors.primary.blue}22` }}
                          >
                            <Folder
                              size={20}
                              style={{ color: subfolder.color || DS.colors.primary.blue }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium truncate" style={{ color: DS.colors.text.primary }}>
                                {subfolder.name}
                              </h3>
                              {subfolder.is_team_folder === 1 && (
                                <Badge variant="success" size="sm">
                                  <Users size={12} className="mr-1" />
                                  Team
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm" style={{ color: DS.colors.text.tertiary }}>
                              <span>{subfolder.owner_username}</span>
                              {subfolder.project_count > 0 && (
                                <>
                                  <span>•</span>
                                  <span>{subfolder.project_count} projects</span>
                                </>
                              )}
                              {subfolder.member_count > 0 && (
                                <>
                                  <span>•</span>
                                  <span>{subfolder.member_count} members</span>
                                </>
                              )}
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" icon={<MoreVertical size={16} />} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Projects */}
                {filteredProjects.length > 0 && (
                  <div>
                    <h2 className="text-lg font-semibold mb-4" style={{ color: DS.colors.text.primary }}>
                      Projects
                    </h2>
                    <div className="space-y-2">
                      {filteredProjects.map((project) => (
                        <div
                          key={project.id}
                          data-project-item
                          className="flex items-center gap-4 p-4 rounded-lg border transition-all cursor-pointer hover:shadow-lg"
                          style={{
                            backgroundColor: DS.colors.background.card,
                            borderColor: DS.colors.border.default,
                          }}
                          onClick={() => router.push(`/project/${project.id}?from=folder`)}
                          onContextMenu={(e) => {
                            // Prevent context menu on projects - they navigate on click
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                        >
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: `${DS.colors.accent.cyan}22` }}
                          >
                            <FileText
                              size={20}
                              style={{ color: DS.colors.accent.cyan }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium truncate" style={{ color: DS.colors.text.primary }}>
                                {project.title}
                              </h3>
                            </div>
                            <div className="flex items-center gap-4 text-sm" style={{ color: DS.colors.text.tertiary }}>
                              <span>@{project.username}</span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Eye size={12} />
                                {project.views || 0}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Star size={12} />
                                {project.likes || 0}
                              </span>
                              <span>•</span>
                              <span>{formatTimeAgo(project.updated_at || project.created_at)}</span>
                            </div>
                          </div>
                          <div className="relative">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              icon={<MoreVertical size={16} />}
                              onClick={(e) => {
                                e.stopPropagation();
                                setProjectMenuOpen(projectMenuOpen === project.id ? null : project.id);
                              }}
                            />
                            {projectMenuOpen === project.id && (
                              <>
                                <div
                                  className="fixed inset-0 z-40"
                                  onClick={() => setProjectMenuOpen(null)}
                                />
                                <div
                                  className="absolute right-0 top-full mt-2 z-50 rounded-lg shadow-xl border py-1 min-w-[200px]"
                                  style={{
                                    backgroundColor: DS.colors.background.card,
                                    borderColor: DS.colors.border.default,
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    onClick={() => {
                                      setSelectedProjectForBranches({ id: project.id, folder_id: folder.id });
                                      setProjectMenuOpen(null);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm transition-colors flex items-center gap-2"
                                    style={{ color: DS.colors.text.primary }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.backgroundColor = DS.colors.background.panelHover;
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor = 'transparent';
                                    }}
                                  >
                                    <GitBranch size={16} />
                                    <span>View Branches</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedProjectForBranches({ id: project.id, folder_id: folder.id });
                                      setProjectMenuOpen(null);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm transition-colors flex items-center gap-2"
                                    style={{ color: DS.colors.text.primary }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.backgroundColor = DS.colors.background.panelHover;
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor = 'transparent';
                                    }}
                                  >
                                    <Plus size={16} />
                                    <span>Add New Branch</span>
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {filteredSubfolders.length === 0 && filteredProjects.length === 0 && (
                  <EmptyState
                    icon={<Folder size={48} />}
                    title={searchQuery ? "No items found" : "Empty folder"}
                    description={searchQuery ? "Try adjusting your search" : "This folder is empty. Right-click anywhere or use the buttons above to create a subfolder or upload a project."}
                    action={
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="secondary" 
                          icon={<Plus size={18} />}
                          onClick={() => setShowNewFolderModal(true)}
                        >
                          New Folder
                        </Button>
                        <Button 
                          variant="primary" 
                          icon={<Plus size={18} />}
                          onClick={() => router.push(`/upload?folder=${id}`)}
                        >
                          Upload File
                        </Button>
                      </div>
                    }
                  />
                )}
              </div>
            </PanelContent>
          </CenterPanel>
        }
        rightPanel={
          <RightPanel>
            <PanelHeader title="Folder Info" />
            <PanelContent>
              {/* Tabs */}
              <div className="flex border-b mb-4" style={{ borderColor: DS.colors.border.default }}>
                <button
                  onClick={() => setActiveTab('info')}
                  className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === 'info' ? 'border-b-2' : ''
                  }`}
                  style={{
                    color: activeTab === 'info' ? DS.colors.primary.blue : DS.colors.text.secondary,
                    borderBottomColor: activeTab === 'info' ? DS.colors.primary.blue : 'transparent'
                  }}
                >
                  Info
                </button>
                <button
                  onClick={() => setActiveTab('notes')}
                  className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === 'notes' ? 'border-b-2' : ''
                  }`}
                  style={{
                    color: activeTab === 'notes' ? DS.colors.primary.blue : DS.colors.text.secondary,
                    borderBottomColor: activeTab === 'notes' ? DS.colors.primary.blue : 'transparent'
                  }}
                >
                  Notes
                </button>
                {folder?.is_team_folder === 1 && (
                  <button
                    onClick={() => setActiveTab('members')}
                    className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                      activeTab === 'members' ? 'border-b-2' : ''
                    }`}
                    style={{
                      color: activeTab === 'members' ? DS.colors.primary.blue : DS.colors.text.secondary,
                      borderBottomColor: activeTab === 'members' ? DS.colors.primary.blue : 'transparent'
                    }}
                  >
                    Members
                  </button>
                )}
                <button
                  onClick={() => setActiveTab('activity')}
                  className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === 'activity' ? 'border-b-2' : ''
                  }`}
                  style={{
                    color: activeTab === 'activity' ? DS.colors.primary.blue : DS.colors.text.secondary,
                    borderBottomColor: activeTab === 'activity' ? DS.colors.primary.blue : 'transparent'
                  }}
                >
                  Activity
                </button>
              </div>

              {activeTab === 'info' && (
                <div className="space-y-4">
                  <Card padding="md" style={{ borderRadius: 0 }}>
                    <div
                      className="w-full h-24 rounded-lg flex items-center justify-center mb-4"
                      style={{ backgroundColor: `${folder.color || DS.colors.primary.blue}22` }}
                    >
                      <Folder size={48} style={{ color: folder.color || DS.colors.primary.blue }} />
                    </div>
                    <h3 className="text-lg font-bold mb-2" style={{ color: DS.colors.text.primary }}>
                      {folder.name}
                    </h3>
                    {folder.description && (
                      <p className="text-sm mb-4" style={{ color: DS.colors.text.secondary }}>
                        {folder.description}
                      </p>
                    )}
                  </Card>

                  <Card padding="md" style={{ borderRadius: 0 }}>
                    <h3 className="font-semibold mb-3 text-sm" style={{ color: DS.colors.text.primary }}>
                      Statistics
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span style={{ color: DS.colors.text.secondary }}>Subfolders</span>
                        <span className="font-semibold" style={{ color: DS.colors.text.primary }}>
                          {subfolders.length}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span style={{ color: DS.colors.text.secondary }}>Projects</span>
                        <span className="font-semibold" style={{ color: DS.colors.text.primary }}>
                          {projects.length}
                        </span>
                      </div>
                      {folder.is_team_folder === 1 && (
                        <div className="flex items-center justify-between">
                          <span style={{ color: DS.colors.text.secondary }}>Members</span>
                          <span className="font-semibold" style={{ color: DS.colors.text.primary }}>
                            {folder.member_count || 0}
                          </span>
                        </div>
                      )}
                    </div>
                  </Card>

                  <Card padding="md" style={{ borderRadius: 0 }}>
                    <h3 className="font-semibold mb-3 text-sm" style={{ color: DS.colors.text.primary }}>
                      Owner
                    </h3>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full" style={{ backgroundColor: DS.colors.background.panelHover }} />
                      <Link 
                        href={`/profile/${folder.owner_username}`}
                        className="font-semibold text-sm hover:underline"
                        style={{ color: DS.colors.primary.blue }}
                      >
                        @{folder.owner_username}
                      </Link>
                    </div>
                  </Card>
                </div>
              )}

              {activeTab === 'notes' && (
                <div className="space-y-4 px-4">
                  <div className="space-y-3">
                    <Textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Add a note to this folder..."
                      rows={3}
                    />
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleAddNote}
                      disabled={!newNote.trim() || submittingNote}
                      icon={<Plus size={14} />}
                    >
                      Add Note
                    </Button>
                  </div>

                  <div className="space-y-3 mt-4">
                    {notes.length === 0 ? (
                      <p className="text-sm text-center py-4" style={{ color: DS.colors.text.tertiary }}>
                        No notes yet. Add one above!
                      </p>
                    ) : (
                      notes.map((note) => (
                        <Card key={note.id} padding="sm">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="text-sm mb-2" style={{ color: DS.colors.text.primary }}>
                                {note.note_text}
                              </p>
                              <div className="flex items-center gap-2 text-xs" style={{ color: DS.colors.text.tertiary }}>
                                <span>@{note.username}</span>
                                <span>•</span>
                                <span>{new Date(note.created_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                            {(() => {
                              const user = localStorage.getItem('user');
                              const userId = user ? JSON.parse(user).id : null;
                              const canDelete = folder.user_role === 'owner' || folder.user_role === 'admin' || (userId && note.user_id === userId);
                              return canDelete ? (
                                <button
                                  onClick={() => handleDeleteNote(note.id)}
                                  className="p-1 rounded hover:bg-gray-800 transition-colors"
                                >
                                  <Trash2 size={14} style={{ color: DS.colors.text.tertiary }} />
                                </button>
                              ) : null;
                            })()}
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'members' && folder?.is_team_folder === 1 && (
                <div className="space-y-4 px-4">
                  {/* Add Member Section */}
                  {(folder.user_role === 'owner' || folder.user_role === 'admin') && (
                    <Card padding="md">
                      <h3 className="font-semibold mb-3 text-sm" style={{ color: DS.colors.text.primary }}>
                        Add Member
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <input
                            type="text"
                            value={memberSearchQuery}
                            onChange={(e) => {
                              const query = e.target.value;
                              setMemberSearchQuery(query);
                              searchUsers(query);
                            }}
                            placeholder="Search by username or email..."
                            className="w-full px-3 py-2 rounded-lg text-sm"
                            style={{
                              backgroundColor: DS.colors.background.panel,
                              border: `1px solid ${DS.colors.border.default}`,
                              color: DS.colors.text.primary
                            }}
                          />
                        </div>

                        {searchResults.length > 0 && (
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {searchResults.map((user) => (
                              <div
                                key={user.id}
                                className="flex items-center justify-between p-2 rounded-lg"
                                style={{ backgroundColor: DS.colors.background.panel }}
                              >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <div
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
                                    style={{
                                      backgroundColor: user.avatar ? 'transparent' : DS.colors.primary.blue,
                                      color: '#ffffff'
                                    }}
                                  >
                                    {user.avatar ? (
                                      <img
                                        src={`/api/users/profile-picture/${user.avatar}`}
                                        alt={user.username}
                                        className="w-full h-full rounded-full object-cover"
                                        onError={(e) => {
                                          e.currentTarget.style.display = 'none';
                                          const parent = e.currentTarget.parentElement;
                                          if (parent) {
                                            parent.style.backgroundColor = DS.colors.primary.blue;
                                            parent.textContent = user.username.substring(0, 2).toUpperCase();
                                          }
                                        }}
                                      />
                                    ) : (
                                      user.username.substring(0, 2).toUpperCase()
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate" style={{ color: DS.colors.text.primary }}>
                                      {user.username}
                                    </p>
                                    {user.email && (
                                      <p className="text-xs truncate" style={{ color: DS.colors.text.tertiary }}>
                                        {user.email}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => handleInviteClick(user)}
                                  disabled={inviting}
                                  icon={<Plus size={12} />}
                                >
                                  Invite
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}

                        {isSearching && (
                          <p className="text-xs text-center py-2" style={{ color: DS.colors.text.tertiary }}>
                            Searching...
                          </p>
                        )}

                        {memberSearchQuery.length >= 2 && !isSearching && searchResults.length === 0 && (
                          <p className="text-xs text-center py-2" style={{ color: DS.colors.text.tertiary }}>
                            No users found
                          </p>
                        )}
                      </div>
                    </Card>
                  )}

                  {/* Members List */}
                  <Card padding="md">
                    <h3 className="font-semibold mb-3 text-sm" style={{ color: DS.colors.text.primary }}>
                      Members ({members.length})
                    </h3>
                    <div className="space-y-2">
                      {members.length === 0 ? (
                        <p className="text-sm text-center py-4" style={{ color: DS.colors.text.tertiary }}>
                          No members yet
                        </p>
                      ) : (
                        members.map((member) => (
                          <div
                            key={member.id || member.user_id}
                            className="flex items-center justify-between p-2 rounded-lg"
                            style={{ backgroundColor: DS.colors.background.panel }}
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
                                style={{
                                  backgroundColor: member.avatar ? 'transparent' : DS.colors.primary.blue,
                                  color: '#ffffff'
                                }}
                              >
                                {member.avatar ? (
                                  <img
                                    src={`/api/users/profile-picture/${member.avatar}`}
                                    alt={member.username}
                                    className="w-full h-full rounded-full object-cover"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                      const parent = e.currentTarget.parentElement;
                                      if (parent) {
                                        parent.style.backgroundColor = DS.colors.primary.blue;
                                        parent.textContent = member.username.substring(0, 2).toUpperCase();
                                      }
                                    }}
                                  />
                                ) : (
                                  member.username.substring(0, 2).toUpperCase()
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <Link
                                    href={`/profile/${member.username}`}
                                    className="text-sm font-medium truncate hover:underline"
                                    style={{ color: DS.colors.primary.blue }}
                                  >
                                    {member.username}
                                  </Link>
                                  <Badge
                                    variant={member.role === 'owner' ? 'success' : member.role === 'admin' ? 'warning' : 'default'}
                                    size="sm"
                                  >
                                    {member.role}
                                  </Badge>
                                </div>
                                {member.email && (
                                  <p className="text-xs truncate" style={{ color: DS.colors.text.tertiary }}>
                                    {member.email}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {(() => {
                                const user = localStorage.getItem('user');
                                const currentUserId = user ? JSON.parse(user).id : null;
                                const isCurrentUser = currentUserId && member.user_id === currentUserId;
                                const canChangeRole = (folder.user_role === 'owner' || folder.user_role === 'admin') && 
                                                     member.id && 
                                                     !isCurrentUser;
                                
                                return canChangeRole ? (
                                  <button
                                    onClick={() => handleRoleClick(member)}
                                    className="p-1 rounded hover:bg-gray-800 transition-colors"
                                    title="Change role"
                                  >
                                    <Settings size={14} style={{ color: DS.colors.text.tertiary }} />
                                  </button>
                                ) : null;
                              })()}
                              {(folder.user_role === 'owner' || folder.user_role === 'admin') && 
                               member.role !== 'owner' && 
                               member.id && 
                               !(folder.user_role === 'admin' && member.role === 'admin') && (
                                <button
                                  onClick={() => handleRemoveMember(member.id)}
                                  className="p-1 rounded hover:bg-gray-800 transition-colors"
                                  title="Remove member"
                                >
                                  <Trash2 size={14} style={{ color: DS.colors.text.tertiary }} />
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </Card>
                </div>
              )}

              {activeTab === 'activity' && (
                <ActivityPanel folderId={parseInt(id as string)} />
              )}
            </PanelContent>
          </RightPanel>
        }
      />

      <CreateFolderModal 
        isOpen={showNewFolderModal}
        onClose={() => setShowNewFolderModal(false)}
        onSubmit={handleCreateFolder}
        parentId={Number(id)}
      />

      {selectedProjectForBranches && (
        <BranchManagementModal
          isOpen={!!selectedProjectForBranches}
          onClose={() => {
            setSelectedProjectForBranches(null);
            // Refresh folder data when modal closes to show updated master branch
            fetchFolderData();
          }}
          projectId={selectedProjectForBranches.id.toString()}
          folderId={selectedProjectForBranches.folder_id.toString()}
          onBranchChange={() => {
            // Refresh folder data to show updated master branch
            fetchFolderData();
          }}
        />
      )}

      {/* Invite Member Modal */}
      {showInviteModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <h2 className="text-xl font-bold" style={{ color: DS.colors.text.primary }}>
                Invite as
              </h2>
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setSelectedUser(null);
                }}
                className="text-gray-400 hover:text-white transition"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: DS.colors.background.panel }}>
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
                  style={{
                    backgroundColor: selectedUser.avatar ? 'transparent' : DS.colors.primary.blue,
                    color: '#ffffff'
                  }}
                >
                  {selectedUser.avatar ? (
                    <img
                      src={`/api/users/profile-picture/${selectedUser.avatar}`}
                      alt={selectedUser.username}
                      className="w-full h-full rounded-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const parent = e.currentTarget.parentElement;
                        if (parent) {
                          parent.style.backgroundColor = DS.colors.primary.blue;
                          parent.textContent = selectedUser.username.substring(0, 2).toUpperCase();
                        }
                      }}
                    />
                  ) : (
                    selectedUser.username.substring(0, 2).toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate" style={{ color: DS.colors.text.primary }}>
                    {selectedUser.username}
                  </p>
                  {selectedUser.email && (
                    <p className="text-sm truncate" style={{ color: DS.colors.text.tertiary }}>
                      {selectedUser.email}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: DS.colors.text.primary }}>
                  Role
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as 'viewer' | 'editor' | 'admin')}
                  className="w-full px-4 py-3 rounded-lg text-sm"
                  style={{
                    backgroundColor: DS.colors.background.panel,
                    border: `1px solid ${DS.colors.border.default}`,
                    color: DS.colors.text.primary
                  }}
                >
                  <option value="viewer">Viewer - Can view files only</option>
                  <option value="editor">Editor - Can upload and edit files</option>
                  <option value="admin">Admin - Can manage members and settings</option>
                </select>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <h4 className="text-sm font-semibold mb-2" style={{ color: DS.colors.primary.blue }}>
                  Role Permissions
                </h4>
                <ul className="text-xs space-y-1" style={{ color: DS.colors.text.secondary }}>
                  <li>• <strong>Viewer:</strong> View and download files</li>
                  <li>• <strong>Editor:</strong> Upload, edit, and comment</li>
                  <li>• <strong>Admin:</strong> Invite members and manage folder</li>
                </ul>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteModal(false);
                    setSelectedUser(null);
                  }}
                  className="flex-1 px-4 py-3 rounded-lg font-medium transition"
                  style={{
                    backgroundColor: DS.colors.background.panelHover,
                    color: DS.colors.text.primary
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = DS.colors.background.panel;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = DS.colors.background.panelHover;
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleInviteMember}
                  disabled={inviting}
                  className="flex-1 px-4 py-3 rounded-lg font-medium transition"
                  style={{
                    backgroundColor: DS.colors.primary.blue,
                    color: '#ffffff',
                    opacity: inviting ? 0.5 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!inviting) {
                      e.currentTarget.style.backgroundColor = DS.colors.primary.blueHover || DS.colors.primary.blue;
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = DS.colors.primary.blue;
                  }}
                >
                  {inviting ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Role Management Modal */}
      {showRoleModal && selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <h2 className="text-xl font-bold" style={{ color: DS.colors.text.primary }}>
                Change Role
              </h2>
              <button
                onClick={() => {
                  setShowRoleModal(false);
                  setSelectedMember(null);
                  setShowConfirmDialog(false);
                }}
                className="text-gray-400 hover:text-white transition"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: DS.colors.background.panel }}>
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
                  style={{
                    backgroundColor: selectedMember.avatar ? 'transparent' : DS.colors.primary.blue,
                    color: '#ffffff'
                  }}
                >
                  {selectedMember.avatar ? (
                    <img
                      src={`/api/users/profile-picture/${selectedMember.avatar}`}
                      alt={selectedMember.username}
                      className="w-full h-full rounded-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const parent = e.currentTarget.parentElement;
                        if (parent) {
                          parent.style.backgroundColor = DS.colors.primary.blue;
                          parent.textContent = selectedMember.username.substring(0, 2).toUpperCase();
                        }
                      }}
                    />
                  ) : (
                    selectedMember.username.substring(0, 2).toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate" style={{ color: DS.colors.text.primary }}>
                    {selectedMember.username}
                  </p>
                  <p className="text-sm truncate" style={{ color: DS.colors.text.tertiary }}>
                    Current role: {selectedMember.role}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: DS.colors.text.primary }}>
                  New Role
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as 'viewer' | 'editor' | 'admin' | 'owner')}
                  className="w-full px-4 py-3 rounded-lg text-sm"
                  style={{
                    backgroundColor: DS.colors.background.panel,
                    border: `1px solid ${DS.colors.border.default}`,
                    color: DS.colors.text.primary
                  }}
                >
                  <option value="viewer">Viewer - Can view files only</option>
                  <option value="editor">Editor - Can upload and edit files</option>
                  {folder?.user_role === 'owner' && (
                    <>
                      <option value="admin">Admin - Can manage members and settings</option>
                      {selectedMember.role !== 'owner' && (
                        <option value="owner">Owner - Full control (Transfer Ownership)</option>
                      )}
                    </>
                  )}
                  {folder?.user_role === 'admin' && (
                    <option value="admin">Admin - Can manage members and settings</option>
                  )}
                </select>
                {folder?.user_role === 'admin' && (
                  <p className="text-xs mt-1" style={{ color: DS.colors.text.tertiary }}>
                    Admins can only change roles to viewer or editor
                  </p>
                )}
                {newRole === 'owner' && selectedMember.role !== 'owner' && (
                  <p className="text-xs mt-1" style={{ color: DS.colors.accent.warning || '#f59e0b' }}>
                    ⚠️ This will transfer ownership to {selectedMember.username}
                  </p>
                )}
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <h4 className="text-sm font-semibold mb-2" style={{ color: DS.colors.primary.blue }}>
                  Role Permissions
                </h4>
                <ul className="text-xs space-y-1" style={{ color: DS.colors.text.secondary }}>
                  <li>• <strong>Viewer:</strong> View and download files</li>
                  <li>• <strong>Editor:</strong> Upload, edit, and comment</li>
                  <li>• <strong>Admin:</strong> Invite members and manage folder</li>
                  <li>• <strong>Owner:</strong> Full control, can transfer ownership</li>
                </ul>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowRoleModal(false);
                    setSelectedMember(null);
                    setShowConfirmDialog(false);
                  }}
                  className="flex-1 px-4 py-3 rounded-lg font-medium transition"
                  style={{
                    backgroundColor: DS.colors.background.panelHover,
                    color: DS.colors.text.primary
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = DS.colors.background.panel;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = DS.colors.background.panelHover;
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRoleChange}
                  disabled={updatingRole || newRole === selectedMember.role}
                  className="flex-1 px-4 py-3 rounded-lg font-medium transition"
                  style={{
                    backgroundColor: DS.colors.primary.blue,
                    color: '#ffffff',
                    opacity: (updatingRole || newRole === selectedMember.role) ? 0.5 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!updatingRole && newRole !== selectedMember.role) {
                      e.currentTarget.style.backgroundColor = DS.colors.primary.blueHover || DS.colors.primary.blue;
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = DS.colors.primary.blue;
                  }}
                >
                  {updatingRole ? 'Updating...' : 'OK'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Ownership Transfer */}
      {showConfirmDialog && selectedMember && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4" style={{ color: DS.colors.text.primary }}>
                Transfer Ownership?
              </h2>
              <p className="text-sm mb-6" style={{ color: DS.colors.text.secondary }}>
                Are you sure you want to transfer ownership of this folder to <strong>{selectedMember.username}</strong>? 
                You will become an admin and they will become the owner with full control.
              </p>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowConfirmDialog(false);
                  }}
                  className="flex-1 px-4 py-3 rounded-lg font-medium transition"
                  style={{
                    backgroundColor: DS.colors.background.panelHover,
                    color: DS.colors.text.primary
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = DS.colors.background.panel;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = DS.colors.background.panelHover;
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={updateMemberRole}
                  disabled={updatingRole}
                  className="flex-1 px-4 py-3 rounded-lg font-medium transition"
                  style={{
                    backgroundColor: DS.colors.accent.error || '#ef4444',
                    color: '#ffffff',
                    opacity: updatingRole ? 0.5 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!updatingRole) {
                      e.currentTarget.style.backgroundColor = '#dc2626';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = DS.colors.accent.error || '#ef4444';
                  }}
                >
                  {updatingRole ? 'Transferring...' : 'Yes, Transfer Ownership'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Right-click Context Menu */}
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setContextMenu(null)}
          />
          <div
            className="fixed z-50 rounded-lg shadow-xl border py-1 min-w-[200px]"
            style={{
              left: contextMenu.x,
              top: contextMenu.y,
              backgroundColor: DS.colors.background.card,
              borderColor: DS.colors.border.default,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setShowNewFolderModal(true);
                setContextMenu(null);
              }}
              className="w-full text-left px-4 py-2 text-sm transition-colors flex items-center gap-2"
              style={{
                color: DS.colors.text.primary,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = DS.colors.background.panelHover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <Folder size={16} />
              <span>New Subfolder</span>
            </button>
            <button
              onClick={() => {
                router.push(`/upload?folder=${id}`);
                setContextMenu(null);
              }}
              className="w-full text-left px-4 py-2 text-sm transition-colors flex items-center gap-2"
              style={{
                color: DS.colors.text.primary,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = DS.colors.background.panelHover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <FileText size={16} />
              <span>Upload File</span>
            </button>
          </div>
        </>
      )}
    </>
  );
}

