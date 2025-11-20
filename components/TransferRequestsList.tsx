import React, { useState, useEffect } from 'react';

interface TransferRequest {
  id: number;
  entity_type: 'project' | 'folder';
  entity_id: number;
  entity_name: string;
  from_user_id: number;
  from_username: string;
  to_user_id: number;
  to_username: string;
  message: string | null;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  created_at: string;
  responded_at: string | null;
}

export default function TransferRequestsList() {
  const [incomingRequests, setIncomingRequests] = useState<TransferRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<TransferRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing'>('incoming');
  const [processingId, setProcessingId] = useState<number | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const [incomingRes, outgoingRes] = await Promise.all([
        fetch('/api/ownership-transfer?type=incoming'),
        fetch('/api/ownership-transfer?type=outgoing'),
      ]);

      const incoming = await incomingRes.json();
      const outgoing = await outgoingRes.json();

      setIncomingRequests(incoming);
      setOutgoingRequests(outgoing);
    } catch (error) {
      console.error('Error fetching transfer requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (requestId: number, action: 'accept' | 'reject' | 'cancel') => {
    setProcessingId(requestId);

    try {
      const response = await fetch(`/api/ownership-transfer/${requestId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to process request');
      }

      // Refresh requests
      await fetchRequests();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setProcessingId(null);
    }
  };

  const renderRequest = (request: TransferRequest, isIncoming: boolean) => {
    const isPending = request.status === 'pending';
    const canRespond = isIncoming && isPending;
    const canCancel = !isIncoming && isPending;

    return (
      <div
        key={request.id}
        className="bg-gray-700 border border-gray-600 rounded-lg p-4 hover:border-gray-500 transition"
      >
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-1 text-xs rounded ${
                request.entity_type === 'project' ? 'bg-blue-500' : 'bg-purple-500'
              }`}>
                {request.entity_type}
              </span>
              <span className={`px-2 py-1 text-xs rounded ${
                request.status === 'pending' ? 'bg-yellow-500' :
                request.status === 'accepted' ? 'bg-green-500' :
                request.status === 'rejected' ? 'bg-red-500' :
                'bg-gray-500'
              }`}>
                {request.status}
              </span>
            </div>
            <h3 className="font-semibold text-lg">{request.entity_name}</h3>
            <p className="text-sm text-gray-400">
              {isIncoming ? (
                <>From: <span className="text-blue-400">@{request.from_username}</span></>
              ) : (
                <>To: <span className="text-blue-400">@{request.to_username}</span></>
              )}
            </p>
          </div>
          <div className="text-right text-sm text-gray-400">
            {new Date(request.created_at).toLocaleDateString()}
          </div>
        </div>

        {request.message && (
          <div className="bg-gray-800 rounded p-3 mb-3 text-sm">
            <p className="text-gray-400 mb-1">Message:</p>
            <p>{request.message}</p>
          </div>
        )}

        {canRespond && (
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => handleAction(request.id, 'accept')}
              disabled={processingId === request.id}
              className="flex-1 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              {processingId === request.id ? 'Processing...' : 'Accept'}
            </button>
            <button
              onClick={() => handleAction(request.id, 'reject')}
              disabled={processingId === request.id}
              className="flex-1 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              Reject
            </button>
          </div>
        )}

        {canCancel && (
          <button
            onClick={() => handleAction(request.id, 'cancel')}
            disabled={processingId === request.id}
            className="w-full mt-3 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            {processingId === request.id ? 'Cancelling...' : 'Cancel Request'}
          </button>
        )}

        {!canRespond && !canCancel && request.responded_at && (
          <div className="mt-3 text-sm text-gray-400">
            Responded: {new Date(request.responded_at).toLocaleDateString()}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const requests = activeTab === 'incoming' ? incomingRequests : outgoingRequests;
  const pendingCount = incomingRequests.filter(r => r.status === 'pending').length;

  return (
    <div>
      <div className="flex gap-4 border-b border-gray-700 mb-6">
        <button
          onClick={() => setActiveTab('incoming')}
          className={`pb-3 px-4 font-medium border-b-2 transition ${
            activeTab === 'incoming'
              ? 'border-blue-500 text-blue-500'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          Incoming
          {pendingCount > 0 && (
            <span className="ml-2 px-2 py-0.5 text-xs bg-blue-500 text-white rounded-full">
              {pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('outgoing')}
          className={`pb-3 px-4 font-medium border-b-2 transition ${
            activeTab === 'outgoing'
              ? 'border-blue-500 text-blue-500'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          Outgoing
        </button>
      </div>

      {requests.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg mb-2">No {activeTab} transfer requests</p>
          <p className="text-sm">
            {activeTab === 'incoming'
              ? 'Transfer requests you receive will appear here'
              : 'Transfer requests you send will appear here'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map(request => renderRequest(request, activeTab === 'incoming'))}
        </div>
      )}
    </div>
  );
}
