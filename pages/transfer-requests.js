import React from 'react';
import Layout from '@/components/Layout';
import TransferRequestsList from '@/components/TransferRequestsList';

export default function TransferRequests() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Ownership Transfer Requests</h1>
          <p className="text-gray-400">
            Manage incoming and outgoing ownership transfer requests for your projects and folders
          </p>
        </div>

        <TransferRequestsList />
      </div>
    </Layout>
  );
}
