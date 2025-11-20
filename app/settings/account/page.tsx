'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Layout from '../../../components/Layout';

interface ProviderInfo {
  connected: boolean;
  accountId?: string;
  connectedAt?: string;
}

interface Providers {
  google: ProviderInfo;
  github: ProviderInfo;
}

export default function AccountSettings() {
  const router = useRouter();
  const [providers, setProviders] = useState<Providers | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const res = await fetch('/api/auth/providers', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setProviders(data.providers);
      } else if (res.status === 401) {
        router.push('/login');
      }
    } catch (error) {
      console.error('Error fetching providers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (provider: 'google' | 'github') => {
    try {
      setConnecting(provider);
      setMessage(null);

      const result = await signIn(provider, {
        callbackUrl: '/settings/account',
        redirect: false,
      });

      if (result?.error) {
        setMessage({ type: 'error', text: `Failed to connect ${provider}. Please try again.` });
      } else if (result?.url) {
        window.location.href = result.url;
      }
    } catch (error) {
      setMessage({ type: 'error', text: `Failed to connect ${provider}` });
    } finally {
      setConnecting(null);
    }
  };

  const handleDisconnect = async (provider: 'google' | 'github') => {
    if (!confirm(`Are you sure you want to disconnect your ${provider} account?`)) {
      return;
    }

    try {
      setDisconnecting(provider);
      setMessage(null);

      const token = localStorage.getItem('token');
      const res = await fetch('/api/auth/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ provider }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: data.message });
        fetchProviders(); // Refresh provider list
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to disconnect provider' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to disconnect provider' });
    } finally {
      setDisconnecting(null);
    }
  };

  const getProviderIcon = (provider: string) => {
    if (provider === 'google') {
      return (
        <svg className="w-6 h-6" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
      );
    } else {
      return (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"/>
        </svg>
      );
    }
  };

  return (
    <Layout>
      <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Account Settings</h1>
            <p className="mt-2 text-gray-400">
              Manage your connected accounts and authentication methods
            </p>
          </div>

          {message && (
            <div className={`mb-6 p-4 rounded-lg ${
              message.type === 'success' 
                ? 'bg-green-500/10 border border-green-500/20 text-green-500' 
                : 'bg-red-500/10 border border-red-500/20 text-red-500'
            }`}>
              {message.text}
            </div>
          )}

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8">
            <h2 className="text-xl font-bold mb-6">Connected Accounts</h2>
            
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
              </div>
            ) : providers ? (
              <div className="space-y-4">
                {/* Google */}
                <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                  <div className="flex items-center gap-4">
                    {getProviderIcon('google')}
                    <div>
                      <h3 className="font-semibold">Google</h3>
                      <p className="text-sm text-gray-400">
                        {providers.google.connected 
                          ? `Connected ${providers.google.connectedAt ? new Date(providers.google.connectedAt).toLocaleDateString() : ''}`
                          : 'Not connected'}
                      </p>
                    </div>
                  </div>
                  
                  {providers.google.connected ? (
                    <button
                      onClick={() => handleDisconnect('google')}
                      disabled={disconnecting !== null}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {disconnecting === 'google' ? (
                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        'Disconnect'
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleConnect('google')}
                      disabled={connecting !== null}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {connecting === 'google' ? (
                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        'Connect'
                      )}
                    </button>
                  )}
                </div>

                {/* GitHub */}
                <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                  <div className="flex items-center gap-4">
                    {getProviderIcon('github')}
                    <div>
                      <h3 className="font-semibold">GitHub</h3>
                      <p className="text-sm text-gray-400">
                        {providers.github.connected 
                          ? `Connected ${providers.github.connectedAt ? new Date(providers.github.connectedAt).toLocaleDateString() : ''}`
                          : 'Not connected'}
                      </p>
                    </div>
                  </div>
                  
                  {providers.github.connected ? (
                    <button
                      onClick={() => handleDisconnect('github')}
                      disabled={disconnecting !== null}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {disconnecting === 'github' ? (
                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        'Disconnect'
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleConnect('github')}
                      disabled={connecting !== null}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {connecting === 'github' ? (
                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        'Connect'
                      )}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-gray-400 text-center py-8">Failed to load providers</p>
            )}

            <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <div className="flex gap-3">
                <svg className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm text-blue-400">
                  <p className="font-semibold mb-1">Security Note</p>
                  <p>You must have at least one authentication method enabled. If you want to disconnect all OAuth providers, please set a password first.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
