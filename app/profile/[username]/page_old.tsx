'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import ProjectCard from '@/components/ProjectCard';

export default function Profile() {
  const params = useParams();
  const router = useRouter();
  const username = (params?.username || '') as string;
  const [profile, setProfile] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setCurrentUser(JSON.parse(userData));
    }
  }, []);

  useEffect(() => {
    if (username) {
      fetchProfile();
      fetchUserProjects();
      checkFollowStatus();
    }
  }, [username, currentUser]);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/${username}`, { 
        headers,
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      } else if (res.status === 404) {
        // User doesn't exist
        setProfile(null);
      } else {
        console.error('Failed to fetch profile, status:', res.status);
        setProfile(null);
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const [followPending, setFollowPending] = useState(false);

  const checkFollowStatus = async () => {
    if (!currentUser) return;
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/${username}/following`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setFollowing(data.following);
        // Check if there's a pending request
        if (!data.following) {
          const pendingRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/check-pending?username=${username}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          if (pendingRes.ok) {
            const pendingData = await pendingRes.json();
            setFollowPending(pendingData.pending);
          }
        }
      }
    } catch (err) {
      console.error('Failed to check follow status:', err);
    }
  };

  const fetchUserProjects = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/projects?username=${username}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    }
  };

  const handleFollow = async () => {
    if (!currentUser) {
      router.push('/login');
      return;
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/${username}/follow`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setFollowing(data.following);
        setFollowPending(data.pending || false);
        
        // If it was a private profile and follow was accepted, reload to show content
        if (profile.isPrivate && data.following) {
          // Refresh the profile data
          fetchProfile();
          fetchUserProjects();
        } else if (profile.followers !== undefined && !data.pending) {
          // Update follower count for public profiles (not for pending requests)
          setProfile({
            ...profile,
            followers: data.following ? profile.followers + 1 : profile.followers - 1
          });
        }
      }
    } catch (err) {
      console.error('Failed to follow:', err);
    }
  };

  if (loading) {
    return (<Layout>
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-gray-700 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
      </Layout>
    );
  }

  if (!profile) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">User Not Found</h1>
        </div>
      </Layout>
    );
  }

  // Handle private account
  if (profile.isPrivate) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto py-12 text-center">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-12">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gray-800 flex items-center justify-center">
              <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-3">This Account is Private</h1>
            <p className="text-gray-400 mb-6">
              Follow @{username} to see their projects and activity
            </p>
            {currentUser && currentUser.username !== username && (
              <button
                onClick={handleFollow}
                className={`px-6 py-3 rounded-lg font-medium transition ${
                  followPending
                    ? 'bg-yellow-600 hover:bg-yellow-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {followPending ? 'Request Sent' : 'Request to Follow'}
              </button>
            )}
          </div>
        </div>
      </Layout>
    );
  }

  const isOwnProfile = currentUser?.username === username;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto py-8">
        {/* Profile Header */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden mb-8">
          {/* Banner */}
          {profile.banner && (
            <div className="w-full h-48 bg-gray-800">
              <img
                src={`/api/users/profile-picture/${profile.banner}`}
                alt="Profile Banner"
                className="w-full h-full object-cover"
              />
            </div>
          )}
          
          <div className="p-8">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              {/* Avatar */}
              <div className={`w-24 h-24 rounded-full overflow-hidden flex-shrink-0 border-4 border-gray-900 ${profile.banner ? '-mt-16' : ''}`}>
                {profile.profile_picture ? (
                  <img
                    src={`/api/users/profile-picture/${profile.profile_picture}`}
                    alt={username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-3xl font-bold">
                    {username[0].toUpperCase()}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 text-center md:text-left">
                <div className="flex items-center gap-3 justify-center md:justify-start mb-2">
                  <h1 className="text-3xl font-bold">{username}</h1>
                  {profile.profile_private && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-gray-800 rounded-lg text-sm text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Private
                    </div>
                  )}
                </div>

                {/* OAuth Provider Badges */}
                {profile.oauth_providers && profile.oauth_providers.length > 0 && (
                  <div className="flex items-center gap-2 justify-center md:justify-start mb-3">
                    <span className="text-xs text-gray-500">Connected via:</span>
                    {profile.oauth_providers.includes('google') && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-white/10 border border-white/20 rounded text-xs">
                        <svg className="w-3 h-3" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        Google
                      </div>
                    )}
                    {profile.oauth_providers.includes('github') && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-gray-700/50 border border-gray-600 rounded text-xs">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                          <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"/>
                        </svg>
                        GitHub
                      </div>
                    )}
                  </div>
                )}
                
                <p className="text-gray-400 mb-3 whitespace-pre-wrap">{profile.bio || 'No bio yet'}</p>
                
                {/* Location and Website */}
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mb-4 text-sm text-gray-400">
                  {profile.location && (
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {profile.location}
                    </div>
                  )}
                  {profile.website && (
                    <a
                      href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-blue-400 transition"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      {profile.website.replace(/^https?:\/\//, '')}
                    </a>
                  )}
                </div>

                {/* Social Links */}
                {profile.social_links && Object.keys(profile.social_links).some(key => profile.social_links[key]) && (
                  <div className="flex items-center justify-center md:justify-start gap-3 mb-4">
                    {profile.social_links.github && (
                      <a
                        href={`https://github.com/${profile.social_links.github}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-white transition"
                        title="GitHub"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path fillRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" clipRule="evenodd" />
                        </svg>
                      </a>
                    )}
                    {profile.social_links.twitter && (
                      <a
                        href={`https://twitter.com/${profile.social_links.twitter.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-white transition"
                        title="Twitter/X"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                        </svg>
                      </a>
                    )}
                    {profile.social_links.linkedin && (
                      <a
                        href={`https://linkedin.com/in/${profile.social_links.linkedin}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-white transition"
                        title="LinkedIn"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                        </svg>
                      </a>
                    )}
                    {profile.social_links.youtube && (
                      <a
                        href={`https://youtube.com/@${profile.social_links.youtube}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-white transition"
                        title="YouTube"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                        </svg>
                      </a>
                    )}
                  </div>
                )}
                
                <div className="flex flex-wrap justify-center md:justify-start gap-6 text-sm">
                  <div>
                    <span className="font-bold text-white">{projects.length}</span>
                    <span className="text-gray-400 ml-1">Projects</span>
                  </div>
                  <button
                    onClick={() => router.push(`/profile/${username}/followers`)}
                    className="hover:text-blue-400 transition"
                  >
                    <span className="font-bold text-white">{profile.followers || 0}</span>
                    <span className="text-gray-400 ml-1">Followers</span>
                  </button>
                  <button
                    onClick={() => router.push(`/profile/${username}/following`)}
                    className="hover:text-blue-400 transition"
                  >
                    <span className="font-bold text-white">{profile.following || 0}</span>
                    <span className="text-gray-400 ml-1">Following</span>
                  </button>
                  <div className="hidden">
                    <span className="font-bold text-white">{profile.following || 0}</span>
                    <span className="text-gray-400 ml-1">Following</span>
                  </div>
                </div>
              </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              {!isOwnProfile && currentUser && (
                <>
                  <button
                    onClick={handleFollow}
                    className={`px-6 py-2 rounded-lg font-medium transition ${
                      following
                        ? 'bg-gray-800 hover:bg-gray-700'
                        : followPending
                        ? 'bg-yellow-600 hover:bg-yellow-700'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {following ? 'Following' : followPending ? 'Requested' : 'Follow'}
                  </button>
                  <button
                    onClick={() => router.push(`/messages?with=${username}`)}
                    className="px-6 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg font-medium transition flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Message
                  </button>
                </>
              )}
              {isOwnProfile && (
                <>
                  <button
                    onClick={() => setShowEditModal(true)}
                    className="px-6 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg font-medium transition flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit Profile
                  </button>
                  <button 
                    onClick={() => router.push('/folders')}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    Folders
                  </button>
                </>
              )}
            </div>
          </div>
          </div>
        </div>

        {/* Edit Profile Modal */}
        {showEditModal && (
          <EditProfileModal
            profile={profile}
            onClose={() => setShowEditModal(false)}
            onSuccess={(updatedProfile) => {
              setProfile(updatedProfile);
              setShowEditModal(false);
            }}
          />
        )}

        {/* Projects */}
        <div>
          <h2 className="text-2xl font-bold mb-6">
            {isOwnProfile ? 'Your Projects' : `${username}'s Projects`}
          </h2>
          
          {projects.length === 0 ? (
            <div className="text-center py-12 bg-gray-900 border border-gray-800 rounded-xl">
              <p className="text-gray-400 mb-4">No projects yet</p>
              {isOwnProfile && (
                <button
                  onClick={() => router.push('/upload')}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition"
                >
                  Upload Your First Design
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map(project => (
                <ProjectCard key={project.id} project={project} showAiEstimate={true} />
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

// Edit Profile Modal Component
function EditProfileModal({ profile, onClose, onSuccess }: { profile: any; onClose: () => void; onSuccess: (profile: any) => void }) {
  const [bio, setBio] = useState(profile.bio || '');
  const [location, setLocation] = useState(profile.location || '');
  const [website, setWebsite] = useState(profile.website || '');
  const [isPrivate, setIsPrivate] = useState(!!profile.profile_private);
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [banner, setBanner] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Social links
  const [socialLinks, setSocialLinks] = useState({
    github: profile.social_links?.github || '',
    twitter: profile.social_links?.twitter || '',
    linkedin: profile.social_links?.linkedin || '',
    youtube: profile.social_links?.youtube || ''
  });
  
  // Visibility options
  const [visibilityOptions, setVisibilityOptions] = useState({
    showEmail: profile.visibility_options?.showEmail || false,
    showLocation: profile.visibility_options?.showLocation !== false,
    showWebsite: profile.visibility_options?.showWebsite !== false,
    showSocial: profile.visibility_options?.showSocial !== false
  });

  // Sync state with profile prop when it changes
  useEffect(() => {
    setBio(profile.bio || '');
    setLocation(profile.location || '');
    setWebsite(profile.website || '');
    setIsPrivate(!!profile.profile_private);
    setSocialLinks({
      github: profile.social_links?.github || '',
      twitter: profile.social_links?.twitter || '',
      linkedin: profile.social_links?.linkedin || '',
      youtube: profile.social_links?.youtube || ''
    });
    setVisibilityOptions({
      showEmail: profile.visibility_options?.showEmail || false,
      showLocation: profile.visibility_options?.showLocation !== false,
      showWebsite: profile.visibility_options?.showWebsite !== false,
      showSocial: profile.visibility_options?.showSocial !== false
    });
  }, [profile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'profile' | 'banner') => {
    const file = e.target.files?.[0];
    if (file) {
      const maxSize = type === 'banner' ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
      if (file.size > maxSize) {
        setError(`File size must be less than ${type === 'banner' ? '10' : '5'}MB`);
        return;
      }
      if (!file.type.startsWith('image/')) {
        setError('File must be an image');
        return;
      }
      
      if (type === 'profile') {
        setProfilePicture(file);
        setPreviewUrl(URL.createObjectURL(file));
      } else {
        setBanner(file);
        setBannerPreviewUrl(URL.createObjectURL(file));
      }
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate inputs
    if (bio.length > 500) {
      setError('Bio must be 500 characters or less');
      return;
    }
    if (location.length > 100) {
      setError('Location must be 100 characters or less');
      return;
    }
    if (website.length > 200) {
      setError('Website URL must be 200 characters or less');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      const formData = new FormData();
      formData.append('bio', bio);
      formData.append('location', location);
      formData.append('website', website);
      formData.append('social_links', JSON.stringify(socialLinks));
      formData.append('visibility_options', JSON.stringify(visibilityOptions));
      
      if (profilePicture) {
        formData.append('profile_picture', profilePicture);
      }
      if (banner) {
        formData.append('banner', banner);
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (res.ok) {
        const updatedProfile = await res.json();
        
        // Update privacy setting
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/profile`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ isPrivate })
        });
        
        onSuccess({ ...updatedProfile, profile_private: isPrivate ? 1 : 0 });
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to update profile');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl max-w-lg w-full p-6 border border-gray-800">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Edit Profile</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto px-1">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Banner Upload */}
          <div>
            <label className="block text-sm font-medium mb-3">Profile Banner</label>
            <div className="relative w-full h-32 rounded-lg overflow-hidden border-2 border-gray-700 bg-gray-800">
              {bannerPreviewUrl ? (
                <img src={bannerPreviewUrl} alt="Banner Preview" className="w-full h-full object-cover" />
              ) : profile.banner ? (
                <img
                  src={`/api/users/profile-picture/${profile.banner}`}
                  alt="Current Banner"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500">
                  No banner image
                </div>
              )}
            </div>
            <label className="mt-2 inline-block px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg font-medium transition cursor-pointer text-sm">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange(e, 'banner')}
                className="hidden"
              />
              Choose Banner Image
            </label>
            <p className="text-xs text-gray-500 mt-1">Recommended: 1500x500px, Max 10MB</p>
          </div>

          {/* Profile Picture Upload */}
          <div>
            <label className="block text-sm font-medium mb-3">Profile Picture</label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-gray-700">
                {previewUrl ? (
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                ) : profile.profile_picture ? (
                  <img
                    src={`/api/users/profile-picture/${profile.profile_picture}`}
                    alt="Current"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-2xl font-bold">
                    {profile.username[0].toUpperCase()}
                  </div>
                )}
              </div>
              <label className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg font-medium transition cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, 'profile')}
                  className="hidden"
                />
                Choose Image
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-2">Maximum file size: 5MB</p>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium mb-2">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              maxLength={500}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none resize-none"
              placeholder="Tell us about yourself..."
            />
            <p className="text-xs text-gray-500 mt-1">{bio.length}/500 characters</p>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium mb-2">Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              maxLength={100}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
              placeholder="City, Country"
            />
          </div>

          {/* Website */}
          <div>
            <label className="block text-sm font-medium mb-2">Website</label>
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              maxLength={200}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
              placeholder="https://yourwebsite.com"
            />
          </div>

          {/* Social Links */}
          <div className="border-t border-gray-800 pt-6">
            <h3 className="text-sm font-medium mb-3">Social Links</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">GitHub</label>
                <input
                  type="text"
                  value={socialLinks.github}
                  onChange={(e) => setSocialLinks({...socialLinks, github: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
                  placeholder="username"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Twitter/X</label>
                <input
                  type="text"
                  value={socialLinks.twitter}
                  onChange={(e) => setSocialLinks({...socialLinks, twitter: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
                  placeholder="@username"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">LinkedIn</label>
                <input
                  type="text"
                  value={socialLinks.linkedin}
                  onChange={(e) => setSocialLinks({...socialLinks, linkedin: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
                  placeholder="username"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">YouTube</label>
                <input
                  type="text"
                  value={socialLinks.youtube}
                  onChange={(e) => setSocialLinks({...socialLinks, youtube: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
                  placeholder="channel"
                />
              </div>
            </div>
          </div>

          {/* Visibility Options */}
          <div className="border-t border-gray-800 pt-6">
            <h3 className="text-sm font-medium mb-3">Visibility Settings</h3>
            <div className="space-y-3">
              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Show email on profile</span>
                <input
                  type="checkbox"
                  checked={visibilityOptions.showEmail}
                  onChange={(e) => setVisibilityOptions({...visibilityOptions, showEmail: e.target.checked})}
                  className="w-4 h-4 bg-gray-800 border-gray-700 rounded focus:ring-2 focus:ring-blue-500"
                />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Show location on profile</span>
                <input
                  type="checkbox"
                  checked={visibilityOptions.showLocation}
                  onChange={(e) => setVisibilityOptions({...visibilityOptions, showLocation: e.target.checked})}
                  className="w-4 h-4 bg-gray-800 border-gray-700 rounded focus:ring-2 focus:ring-blue-500"
                />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Show website on profile</span>
                <input
                  type="checkbox"
                  checked={visibilityOptions.showWebsite}
                  onChange={(e) => setVisibilityOptions({...visibilityOptions, showWebsite: e.target.checked})}
                  className="w-4 h-4 bg-gray-800 border-gray-700 rounded focus:ring-2 focus:ring-blue-500"
                />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Show social links on profile</span>
                <input
                  type="checkbox"
                  checked={visibilityOptions.showSocial}
                  onChange={(e) => setVisibilityOptions({...visibilityOptions, showSocial: e.target.checked})}
                  className="w-4 h-4 bg-gray-800 border-gray-700 rounded focus:ring-2 focus:ring-blue-500"
                />
              </label>
            </div>
          </div>

          {/* Privacy Toggle */}
          <div className="border-t border-gray-800 pt-6">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium mb-1">Private Account</label>
                <p className="text-xs text-gray-500">
                  When enabled, only followers can see your profile, projects, and activity
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPrivate(!isPrivate)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isPrivate ? 'bg-blue-600' : 'bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isPrivate ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}