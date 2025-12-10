import { useState, useEffect } from 'react';
import { FolderInvitation } from '../types';

export default function InvitationsNotification() {
  const [invitations, setInvitations] = useState<FolderInvitation[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    fetchInvitations();
    // Poll for new invitations every 30 seconds
    const interval = setInterval(fetchInvitations, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchInvitations = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/invitations`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setInvitations(data);
      }
    } catch (error) {
      console.error('Failed to fetch invitations:', error);
    }
  };

  const handleResponse = async (invitationId: number, action: 'accept' | 'decline') => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/invitations/${invitationId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ action })
      });

      if (res.ok) {
        fetchInvitations();
        if (action === 'accept') {
          alert('Invitation accepted! You can now access the folder.');
        }
      }
    } catch (error) {
      console.error('Failed to respond to invitation:', error);
    }
  };

  if (invitations.length === 0) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-gray-400 hover:text-white transition"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {invitations.length > 0 && (
          <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center text-white font-bold">
            {invitations.length}
          </span>
        )}
      </button>

      {showDropdown && (
        <>
          <div 
            className="fixed inset-0 z-10"
            onClick={() => setShowDropdown(false)}
          />
          <div className="absolute right-0 mt-2 w-96 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl z-20">
            <div className="p-4 border-b border-gray-800">
              <h3 className="font-semibold">Folder Invitations</h3>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {invitations.map((invitation) => (
                <div key={invitation.id} className="p-4 border-b border-gray-800 hover:bg-gray-800/50">
                  <p className="text-sm mb-2">
                    <span className="font-semibold text-blue-400">{invitation.invited_by_username}</span>
                    {' '}invited you to join
                    {' '}<span className="font-semibold">{invitation.folder_name}</span>
                  </p>
                  <p className="text-xs text-gray-500 mb-3">
                    Role: <span className="text-emerald-400">{invitation.role}</span>
                  </p>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleResponse(invitation.id, 'accept')}
                      className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleResponse(invitation.id, 'decline')}
                      className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium transition"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}