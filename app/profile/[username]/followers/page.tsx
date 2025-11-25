'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ThreePanelLayout,
  CenterPanel,
  PanelHeader,
  PanelContent,
} from '@/components/ui/ThreePanelLayout';
import { GlobalNavSidebar } from '@/components/ui/GlobalNavSidebar';
import { Card, Button, EmptyState } from '@/components/ui/UIComponents';
import { DesignSystem as DS } from '@/backend/lib/ui/design-system';
import { ArrowLeft, User, Lock } from 'lucide-react';

interface User {
  id: number;
  username: string;
  profile_picture: string | null;
  bio: string | null;
  isPrivate?: boolean;
  followers?: number;
}

export default function FollowersPage() {
  const params = useParams();
  const router = useRouter();
  const username = params?.username as string;
  
  const [followers, setFollowers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    if (username) {
      fetchFollowers();
    }
  }, [username, page]);

  const fetchFollowers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/users/${username}/followers?page=${page}&limit=${ITEMS_PER_PAGE}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch followers');
      }

      const data = await res.json();
      
      if (page === 1) {
        setFollowers(data.followers);
      } else {
        setFollowers(prev => [...prev, ...data.followers]);
      }
      
      setTotalCount(data.total);
      setHasMore(data.hasMore);
      setError('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    setPage(prev => prev + 1);
  };

  return (
    <ThreePanelLayout
      leftPanel={<GlobalNavSidebar />}
      centerPanel={
        <CenterPanel>
          <PanelHeader
            title={`${username}'s Followers`}
            actions={
              <Button
                variant="secondary"
                icon={<ArrowLeft size={18} />}
                onClick={() => router.back()}
              >
                Back
              </Button>
            }
          />
          <PanelContent>
            <div className="max-w-4xl mx-auto px-6 py-6">
              {error && (
                <Card padding="md" className="mb-6">
                  <div className="p-4 text-sm rounded-md" style={{ background: DS.colors.accent.error + '20', border: `1px solid ${DS.colors.accent.error}40`, color: DS.colors.accent.error }}>
                    {error}
                  </div>
                </Card>
              )}

              <div className="mb-6">
                <p className="text-sm" style={{ color: DS.colors.text.secondary }}>
                  {totalCount} {totalCount === 1 ? 'follower' : 'followers'}
                </p>
              </div>

              {loading && page === 1 ? (
                <div className="flex items-center justify-center py-20">
                  <div className="animate-spin w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full"></div>
                </div>
              ) : followers.length === 0 ? (
                <EmptyState
                  icon={<User size={48} />}
                  title="No followers yet"
                  description="This user doesn't have any followers."
                />
              ) : (
                <div className="space-y-3">
                  {followers.map((user) => (
                    <Link key={user.id} href={`/profile/${user.username}`}>
                      <Card
                        hover={true}
                        padding="md"
                      >
                        <div className="flex items-center gap-4">
                          <div 
                            className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0 border-2"
                            style={{ 
                              backgroundColor: user.profile_picture ? 'transparent' : DS.colors.primary.blue, 
                              color: '#ffffff',
                              borderColor: DS.colors.border.default
                            }}
                          >
                            {user.profile_picture ? (
                              <img
                                src={`/api/users/profile-picture/${user.profile_picture}`}
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
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold truncate" style={{ color: DS.colors.text.primary }}>
                                {user.username}
                              </h3>
                              {user.isPrivate && (
                                <Lock size={14} style={{ color: DS.colors.text.tertiary }} />
                              )}
                            </div>
                            {user.bio && !user.isPrivate && (
                              <p className="text-sm truncate mt-1" style={{ color: DS.colors.text.secondary }}>
                                {user.bio}
                              </p>
                            )}
                            {!user.isPrivate && user.followers !== undefined && (
                              <p className="text-xs mt-1" style={{ color: DS.colors.text.tertiary }}>
                                {user.followers} {user.followers === 1 ? 'follower' : 'followers'}
                              </p>
                            )}
                          </div>
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}

              {hasMore && !loading && followers.length > 0 && (
                <div className="mt-6 text-center">
                  <Button
                    variant="secondary"
                    onClick={handleLoadMore}
                  >
                    Load More
                  </Button>
                </div>
              )}

              {loading && page > 1 && (
                <div className="text-center py-6">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-400 border-t-transparent"></div>
                </div>
              )}
            </div>
          </PanelContent>
        </CenterPanel>
      }
    />
  );
}
