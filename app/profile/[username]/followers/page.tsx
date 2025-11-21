'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/navbar';

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

  const handleUserClick = (username: string) => {
    router.push(`/profile/${username}`);
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-blue-400 hover:text-blue-300 flex items-center gap-2 mb-4"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold text-white">
            {username}'s Followers
          </h1>
          <p className="text-gray-400 mt-1">{totalCount} followers</p>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-500 text-red-400 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {loading && page === 1 ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : followers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400">No followers yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {followers.map((user) => (
              <div
                key={user.id}
                onClick={() => !user.isPrivate && handleUserClick(user.username)}
                className={`bg-gray-800 rounded-lg p-4 border border-gray-700 ${
                  !user.isPrivate ? 'cursor-pointer hover:border-blue-500 hover:bg-gray-750 transition-all' : 'opacity-60'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gray-700 flex-shrink-0 overflow-hidden">
                    {user.profile_picture ? (
                      <img
                        src={user.profile_picture}
                        alt={user.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500 text-xl font-bold">
                        {user.username[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-white truncate">
                        {user.username}
                      </h3>
                      {user.isPrivate && (
                        <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                          🔒 Private
                        </span>
                      )}
                    </div>
                    {user.bio && !user.isPrivate && (
                      <p className="text-sm text-gray-400 truncate mt-1">{user.bio}</p>
                    )}
                    {!user.isPrivate && user.followers !== undefined && (
                      <p className="text-xs text-gray-500 mt-1">
                        {user.followers} followers
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {hasMore && !loading && followers.length > 0 && (
          <div className="mt-6 text-center">
            <button
              onClick={handleLoadMore}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Load More
            </button>
          </div>
        )}

        {loading && page > 1 && (
          <div className="text-center py-6">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        )}
      </div>
    </div>
  );
}
