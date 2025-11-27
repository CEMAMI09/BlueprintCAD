'use client';

import React from 'react';
import {
  ThreePanelLayout,
  CenterPanel,
  PanelHeader,
  PanelContent,
} from '@/components/ui/ThreePanelLayout';
import { GlobalNavSidebar } from '@/components/ui/GlobalNavSidebar';
import TransferRequestsList from '@/components/TransferRequestsList';

export default function TransferRequests() {
  return (
    <ThreePanelLayout
      leftPanel={<GlobalNavSidebar />}
      centerPanel={
        <CenterPanel>
          <PanelHeader title="Ownership Transfer Requests" />
          <PanelContent>
            <div className="max-w-4xl mx-auto py-8">
              <p className="text-sm mb-6" style={{ color: '#909296' }}>
                Manage incoming and outgoing ownership transfer requests for your projects and folders
              </p>
              <TransferRequestsList />
            </div>
          </PanelContent>
        </CenterPanel>
      }
    />
  );
}

