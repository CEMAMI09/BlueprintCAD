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
} from 'lucide-react';
import BranchManagementModal from '@/frontend/components/BranchManagementModal';
import { Textarea } from '@/components/ui/UIComponents';

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
  const [activeTab, setActiveTab] = useState<'info' | 'notes'>('info');
  const [submittingNote, setSubmittingNote] = useState(false);

  useEffect(() => {
    if (id) {
      fetchFolderData();
      fetchBreadcrumb();
      fetchNotes();
    }
  }, [id]);

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
                          onClick={() => router.push(`/project/${project.id}`)}
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

