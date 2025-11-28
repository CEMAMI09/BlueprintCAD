export interface User {
  id: number;
  username: string;
  email: string;
  bio?: string;
  avatar?: string;
  created_at: string;
}

export interface Folder {
  id: number;
  name: string;
  description?: string;
  owner_id: number;
  parent_id?: number;
  is_team_folder: boolean;
  color: string;
  created_at: string;
  updated_at: string;
  owner_username?: string;
  member_count?: number;
  project_count?: number;
  user_role?: string;
  subfolders?: Folder[];
  children?: Folder[];
}

export interface FolderMember {
  id: number;
  folder_id: number;
  user_id: number;
  username: string;
  email: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  invited_by?: number;
  joined_at: string;
}

export interface FolderInvitation {
  id: number;
  folder_id: number;
  folder_name: string;
  invited_user_id: number;
  invited_by: number;
  invited_by_username: string;
  role: 'admin' | 'editor' | 'viewer';
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  responded_at?: string;
}

export interface Project {
  id: number;
  user_id: number;
  folder_id?: number;
  title: string;
  description?: string;
  file_path: string;
  file_type?: string;
  tags?: string;
  is_public: boolean;
  for_sale: boolean;
  price?: number;
  ai_estimate?: string;
  views: number;
  likes: number;
  created_at: string;
  updated_at: string;
  username?: string;
}

export interface FolderActivity {
  id: number;
  folder_id: number;
  user_id: number;
  username: string;
  action: string;
  target_type?: string;
  target_id?: number;
  details?: string;
  created_at: string;
}

export interface FolderComment {
  id: number;
  folder_id: number;
  project_id?: number;
  user_id: number;
  username: string;
  content: string;
  parent_id?: number;
  created_at: string;
  updated_at: string;
}