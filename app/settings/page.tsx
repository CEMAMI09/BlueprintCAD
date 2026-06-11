/**
 * Settings Page
 * User account and application settings
 */

'use client';

import { useState, useEffect } from 'react';
import {
  ThreePanelLayout,
  CenterPanel,
  PanelHeader,
  PanelContent,
} from '@/components/ui/ThreePanelLayout';
import { GlobalNavSidebar } from '@/components/ui/GlobalNavSidebar';
import { Button, Card, Badge, Tabs } from '@/components/ui/UIComponents';
import { DesignSystem as DS } from '@/backend/lib/ui/design-system';
import { useTheme, type ThemePreference } from '@/app/context/ThemeContext';
import TierBadge from '@/frontend/components/TierBadge';
import Link from 'next/link';
import {
  User,
  Bell,
  Lock,
  CreditCard,
  Palette,
  Globe,
  Shield,
  Download,
  Github,
  Instagram,
  Youtube,
  Image as ImageIcon,
  X,
} from 'lucide-react';

/** Must match backend/lib/notificationPreferences.js */
const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  emailNotifications: true,
  pushNotifications: false,
  commentsOnDesigns: true,
  newFollowers: true,
  marketplaceUpdates: true,
};

type NotificationPreferences = {
  emailNotifications: boolean;
  pushNotifications: boolean;
  commentsOnDesigns: boolean;
  newFollowers: boolean;
  marketplaceUpdates: boolean;
};

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('profile');
  const [appearanceMessage, setAppearanceMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [banner, setBanner] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [userSubscription, setUserSubscription] = useState<any>(null);
  const [notificationPreferences, setNotificationPreferences] =
    useState<NotificationPreferences>({ ...DEFAULT_NOTIFICATION_PREFERENCES });
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifMessage, setNotifMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [pushPermission, setPushPermission] = useState<'default' | 'granted' | 'denied' | 'unsupported'>('default');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPushPermission(Notification.permission as 'default' | 'granted' | 'denied');
    } else {
      setPushPermission('unsupported');
    }
  }, []);

  useEffect(() => {
    fetchUserInfo();
    fetchSubscriptionStatus();
  }, []);

  const fetchUserInfo = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/me`, { headers });
      if (res.ok) {
        const data = await res.json();
        // Initialize social links if not present
        const socialLinks = data.social_links || { github: '', twitter: '', instagram: '', youtube: '' };
        setUserInfo({ ...data, social_links: socialLinks, originalUsername: data.username });
        if (data.notification_preferences && typeof data.notification_preferences === 'object') {
          setNotificationPreferences({
            ...DEFAULT_NOTIFICATION_PREFERENCES,
            ...data.notification_preferences,
          });
        }
        // Set previews for existing images - use the URL from backend if available, otherwise construct proxy URL
        if (data.profile_picture_url) {
          setProfilePicturePreview(data.profile_picture_url);
        } else if (data.profile_picture) {
          setProfilePicturePreview(`${process.env.NEXT_PUBLIC_API_URL}/api/users/profile-picture/${data.profile_picture}`);
        }
        if (data.banner_url) {
          setBannerPreview(data.banner_url);
        } else if (data.banner) {
          setBannerPreview(`${process.env.NEXT_PUBLIC_API_URL}/api/users/banner/${data.banner}`);
        }
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscriptionStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/subscriptions/check`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setUserSubscription(data);
      }
    } catch (error) {
      console.error('Error fetching subscription status:', error);
    }
  };

  const formatStorage = (bytes: number) => {
    if (bytes === -1) return 'Unlimited';
    if (bytes >= 1024 * 1024 * 1024) {
      return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    } else if (bytes >= 1024 * 1024) {
      return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    } else if (bytes >= 1024) {
      return (bytes / 1024).toFixed(2) + ' KB';
    }
    return bytes + ' B';
  };

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfilePicture(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicturePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBanner(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setBannerPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const checkUsernameAvailability = async (username: string) => {
    if (!username || username === userInfo?.username) {
      setUsernameError(null);
      return true;
    }

    // Validate username format
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      setUsernameError('Username must be 3-20 characters and contain only letters, numbers, and underscores');
      return false;
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/${username}`);
      if (res.ok) {
        setUsernameError('Username is already taken');
        return false;
      } else if (res.status === 404) {
        setUsernameError(null);
        return true;
      }
    } catch (error) {
      console.error('Error checking username:', error);
    }
    return true;
  };

  const saveNotificationPreferences = async () => {
    setNotifSaving(true);
    setNotifMessage(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setNotifMessage({ type: 'error', text: 'You must be logged in.' });
        return;
      }
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/me`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notification_preferences: notificationPreferences }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNotifMessage({ type: 'error', text: data.error || 'Failed to save notification settings' });
        return;
      }
      if (data.notification_preferences) {
        setNotificationPreferences({
          ...DEFAULT_NOTIFICATION_PREFERENCES,
          ...data.notification_preferences,
        });
        setUserInfo((prev: any) => (prev ? { ...prev, notification_preferences: data.notification_preferences } : prev));
      }
      setNotifMessage({ type: 'success', text: 'Notification preferences saved.' });
    } catch {
      setNotifMessage({ type: 'error', text: 'Failed to save notification settings' });
    } finally {
      setNotifSaving(false);
    }
  };

  const handlePushToggle = async (enabled: boolean) => {
    if (!enabled) {
      setNotificationPreferences((prev) => ({ ...prev, pushNotifications: false }));
      return;
    }
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotifMessage({
        type: 'error',
        text: 'This browser does not support desktop notifications.',
      });
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      setPushPermission(perm as 'default' | 'granted' | 'denied');
      if (perm !== 'granted') {
        setNotificationPreferences((prev) => ({ ...prev, pushNotifications: false }));
        setNotifMessage({
          type: 'error',
          text:
            perm === 'denied'
              ? 'Notifications are blocked. Enable them in your browser settings for this site.'
              : 'Notification permission was not granted.',
        });
        return;
      }
      setNotificationPreferences((prev) => ({ ...prev, pushNotifications: true }));
      setNotifMessage({
        type: 'success',
        text: 'Browser notifications enabled. Save below to keep this preference on your account.',
      });
    } catch {
      setNotifMessage({ type: 'error', text: 'Could not request notification permission.' });
    }
  };

  const handleSaveProfile = async () => {
    if (!userInfo) return;

    // Check username availability if changed
    if (userInfo.username && userInfo.username !== userInfo.originalUsername) {
      const isAvailable = await checkUsernameAvailability(userInfo.username);
      if (!isAvailable) {
        return;
      }
    }

    setSaving(true);
    setMessage(null);
    setUsernameError(null);

    try {
      const token = localStorage.getItem('token');
      
      // If no files are being uploaded, send JSON instead of FormData
      if (!profilePicture && !banner) {
        const jsonData: {
          bio: string;
          location: string;
          website: string;
          profile_private: boolean;
          social_links: any;
          visibility_options: any;
          username?: string;
        } = {
          bio: userInfo.bio || '',
          location: userInfo.location || '',
          website: userInfo.website || '',
          profile_private: userInfo.profile_private || false,
          social_links: userInfo.social_links || {},
          visibility_options: userInfo.visibility_options || {},
        };
        
        if (userInfo.username && userInfo.username !== userInfo.originalUsername) {
          jsonData.username = userInfo.username;
        }

        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/me`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(jsonData),
        });

        if (res.ok) {
          const updatedData = await res.json();
          setUserInfo({ ...updatedData, originalUsername: updatedData.username });
          setMessage({ type: 'success', text: 'Profile updated successfully' });
          // Update localStorage if username changed
          if (updatedData.username !== userInfo.username) {
            const userData = localStorage.getItem('user');
            if (userData) {
              const user = JSON.parse(userData);
              user.username = updatedData.username;
              localStorage.setItem('user', JSON.stringify(user));
            }
          }
          // Clear file inputs
          setProfilePicture(null);
          setBanner(null);
          return;
        } else {
          const data = await res.json();
          setMessage({ type: 'error', text: data.error || 'Failed to update profile' });
          if (data.error?.includes('username')) {
            setUsernameError(data.error);
          }
          return;
        }
      }
      
      // If files are present, upload them first to /api/upload/profile, then update user via JSON
      let profilePictureKey: string | undefined;
      let bannerKey: string | undefined;

      if (profilePicture) {
        const uploadFormData = new FormData();
        uploadFormData.append('file', profilePicture);
        uploadFormData.append('type', 'profile_picture');

        try {
          const uploadRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/upload/profile`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
            body: uploadFormData,
          });

          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            profilePictureKey = uploadData.key;
          } else {
            const errData = await uploadRes.json().catch(() => ({}));
            console.error('Profile picture upload failed:', errData);
            setMessage({ type: 'error', text: errData.error || 'Failed to upload profile picture' });
            setSaving(false);
            return;
          }
        } catch (err) {
          console.error('Profile picture upload error:', err);
          setMessage({ type: 'error', text: 'Failed to upload profile picture' });
          setSaving(false);
          return;
        }
      }

      if (banner) {
        const uploadFormData = new FormData();
        uploadFormData.append('file', banner);
        uploadFormData.append('type', 'banner');

        try {
          const uploadRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/upload/profile`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
            body: uploadFormData,
          });

          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            bannerKey = uploadData.key;
          } else {
            const errData = await uploadRes.json().catch(() => ({}));
            console.error('Banner upload failed:', errData);
            setMessage({ type: 'error', text: errData.error || 'Failed to upload banner image' });
            setSaving(false);
            return;
          }
        } catch (err) {
          console.error('Banner upload error:', err);
          setMessage({ type: 'error', text: 'Failed to upload banner image' });
          setSaving(false);
          return;
        }
      }

      // Now update user profile with new keys plus other fields
      const jsonDataWithFiles: {
        bio: string;
        location: string;
        website: string;
        profile_private: boolean;
        social_links: any;
        visibility_options: any;
        username?: string;
        profile_picture?: string;
        banner?: string;
      } = {
        bio: userInfo.bio || '',
        location: userInfo.location || '',
        website: userInfo.website || '',
        profile_private: userInfo.profile_private || false,
        social_links: userInfo.social_links || {},
        visibility_options: userInfo.visibility_options || {},
      };

      if (userInfo.username && userInfo.username !== userInfo.originalUsername) {
        jsonDataWithFiles.username = userInfo.username;
      }
      if (profilePictureKey) {
        jsonDataWithFiles.profile_picture = profilePictureKey;
      }
      if (bannerKey) {
        jsonDataWithFiles.banner = bannerKey;
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/me`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jsonDataWithFiles),
      });

      if (res.ok) {
        const updatedData = await res.json();
        setUserInfo({ ...updatedData, originalUsername: updatedData.username });
        setMessage({ type: 'success', text: 'Profile updated successfully' });
        // Update localStorage if username changed
        if (updatedData.username !== userInfo.username) {
          const userData = localStorage.getItem('user');
          if (userData) {
            const user = JSON.parse(userData);
            user.username = updatedData.username;
            localStorage.setItem('user', JSON.stringify(user));
          }
        }
        // Update preview URLs with the new URLs from the response
        if (updatedData.profile_picture_url) {
          setProfilePicturePreview(updatedData.profile_picture_url);
        } else if (updatedData.profile_picture) {
          setProfilePicturePreview(`${process.env.NEXT_PUBLIC_API_URL}/api/users/profile-picture/${updatedData.profile_picture}`);
        }
        if (updatedData.banner_url) {
          setBannerPreview(updatedData.banner_url);
        } else if (updatedData.banner) {
          setBannerPreview(`${process.env.NEXT_PUBLIC_API_URL}/api/users/banner/${updatedData.banner}`);
        }
        // Clear file inputs
        setProfilePicture(null);
        setBanner(null);
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Failed to update profile' });
        if (data.error?.includes('username')) {
          setUsernameError(data.error);
        }
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ThreePanelLayout
      leftPanel={<GlobalNavSidebar />}
      centerPanel={
        <CenterPanel>
          <PanelHeader title="Settings" />
          <PanelContent>
            <div className="max-w-4xl mx-auto py-6">
              {/* Tabs */}
              <Tabs
                tabs={[
                  { id: 'profile', label: 'Profile', icon: <User size={16} /> },
                  { id: 'notifications', label: 'Notifications', icon: <Bell size={16} /> },
                  { id: 'security', label: 'Security', icon: <Lock size={16} /> },
                  { id: 'billing', label: 'Billing', icon: <CreditCard size={16} /> },
                  { id: 'appearance', label: 'Appearance', icon: <Palette size={16} /> },
                ]}
                activeTab={activeTab}
                onTabChange={setActiveTab}
              />

              <div className="mt-8">
                {message && (
                  <div className={`mb-6 p-4 rounded-lg ${
                    message.type === 'success' 
                      ? 'bg-green-500/10 border border-green-500/20 text-green-500' 
                      : 'bg-red-500/10 border border-red-500/20 text-red-500'
                  }`}>
                    {message.text}
                  </div>
                )}

                {activeTab === 'profile' && (
                  <div className="space-y-6">
                    {loading ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                      </div>
                    ) : (
                    <Card padding="lg">
                      <h3 className="text-xl font-bold mb-6" style={{ color: DS.colors.text.primary }}>
                        Profile Information
                      </h3>
                        <div className="space-y-6">
                          {/* Banner Upload */}
                          <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: DS.colors.text.primary }}>
                              Banner Image
                            </label>
                            <div className="relative">
                              <div
                                className="w-full h-48 rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer hover:border-blue-500 transition-colors"
                                style={{
                                  backgroundColor: DS.colors.background.elevated,
                                  borderColor: DS.colors.border.default,
                                }}
                                onClick={() => document.getElementById('banner-upload')?.click()}
                              >
                                {bannerPreview ? (
                                  <img src={bannerPreview} alt="Banner preview" className="w-full h-full object-cover rounded-lg" />
                                ) : (
                                  <div className="text-center">
                                    <ImageIcon size={32} style={{ color: DS.colors.text.tertiary }} className="mx-auto mb-2" />
                                    <p className="text-sm" style={{ color: DS.colors.text.secondary }}>
                                      Click to upload banner (max 10MB)
                                    </p>
                                  </div>
                                )}
                              </div>
                              <input
                                id="banner-upload"
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleBannerChange}
                              />
                            </div>
                          </div>

                          {/* Profile Picture Upload */}
                          <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: DS.colors.text.primary }}>
                              Profile Picture
                            </label>
                            <div className="flex items-center gap-4">
                              <div
                                className="w-24 h-24 rounded-full border-2 border-dashed flex items-center justify-center cursor-pointer hover:border-blue-500 transition-colors overflow-hidden"
                                style={{
                                  backgroundColor: DS.colors.background.elevated,
                                  borderColor: DS.colors.border.default,
                                }}
                                onClick={() => document.getElementById('profile-picture-upload')?.click()}
                              >
                                {profilePicturePreview ? (
                                  <img src={profilePicturePreview} alt="Profile preview" className="w-full h-full object-cover" />
                                ) : (
                                  <ImageIcon size={24} style={{ color: DS.colors.text.tertiary }} />
                                )}
                              </div>
                              <div>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => document.getElementById('profile-picture-upload')?.click()}
                                >
                                  Change Picture
                                </Button>
                                <p className="text-xs mt-1" style={{ color: DS.colors.text.tertiary }}>
                                  Max 5MB. JPG, PNG, GIF, or WebP
                                </p>
                              </div>
                              <input
                                id="profile-picture-upload"
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleProfilePictureChange}
                              />
                            </div>
                          </div>

                          {/* Username */}
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: DS.colors.text.primary }}>
                            Username
                          </label>
                          <input
                            type="text"
                              value={userInfo?.username || ''}
                              onChange={(e) => {
                                setUserInfo({ ...userInfo, username: e.target.value });
                                setUsernameError(null);
                              }}
                              onBlur={() => {
                                if (userInfo?.username && userInfo.username !== userInfo.originalUsername) {
                                  checkUsernameAvailability(userInfo.username);
                                }
                              }}
                            className="w-full px-4 py-2 rounded-lg border"
                            style={{
                              backgroundColor: DS.colors.background.card,
                                borderColor: usernameError ? DS.colors.accent.error : DS.colors.border.default,
                              color: DS.colors.text.primary,
                            }}
                          />
                            {usernameError && (
                              <p className="text-xs mt-1" style={{ color: DS.colors.accent.error }}>
                                {usernameError}
                              </p>
                            )}
                            {!usernameError && userInfo?.username && (
                              <p className="text-xs mt-1" style={{ color: DS.colors.text.tertiary }}>
                                Username can be changed if available
                              </p>
                            )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: DS.colors.text.primary }}>
                            Email
                          </label>
                          <input
                            type="email"
                              value={userInfo?.email || ''}
                              disabled
                              className="w-full px-4 py-2 rounded-lg border opacity-50 cursor-not-allowed"
                            style={{
                              backgroundColor: DS.colors.background.card,
                              borderColor: DS.colors.border.default,
                              color: DS.colors.text.primary,
                            }}
                          />
                            <p className="text-xs mt-1" style={{ color: DS.colors.text.tertiary }}>
                              Email cannot be changed here
                            </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: DS.colors.text.primary }}>
                            Bio
                          </label>
                          <textarea
                            rows={4}
                              value={userInfo?.bio || ''}
                              onChange={(e) => setUserInfo({ ...userInfo, bio: e.target.value })}
                              className="w-full px-4 py-2 rounded-lg border"
                              style={{
                                backgroundColor: DS.colors.background.card,
                                borderColor: DS.colors.border.default,
                                color: DS.colors.text.primary,
                              }}
                              placeholder="Tell us about yourself..."
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: DS.colors.text.primary }}>
                              Location
                            </label>
                            <input
                              type="text"
                              value={userInfo?.location || ''}
                              onChange={(e) => setUserInfo({ ...userInfo, location: e.target.value })}
                              className="w-full px-4 py-2 rounded-lg border"
                              style={{
                                backgroundColor: DS.colors.background.card,
                                borderColor: DS.colors.border.default,
                                color: DS.colors.text.primary,
                              }}
                              placeholder="Your location"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: DS.colors.text.primary }}>
                              Website
                            </label>
                            <input
                              type="url"
                              value={userInfo?.website || ''}
                              onChange={(e) => setUserInfo({ ...userInfo, website: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg border"
                            style={{
                              backgroundColor: DS.colors.background.card,
                              borderColor: DS.colors.border.default,
                              color: DS.colors.text.primary,
                            }}
                              placeholder="https://yourwebsite.com"
                            />
                          </div>

                          {/* Social Links */}
                          <div>
                            <label className="block text-sm font-medium mb-3" style={{ color: DS.colors.text.primary }}>
                              Social Links
                            </label>
                            <p className="text-xs mb-3" style={{ color: DS.colors.text.tertiary }}>
                              Just enter your username (e.g., "johndoe" not "github.com/johndoe")
                            </p>
                            <div className="space-y-3">
                              <div className="flex items-center gap-3">
                                <Github size={20} style={{ color: DS.colors.text.secondary }} />
                                <input
                                  type="text"
                                  value={userInfo?.social_links?.github || ''}
                                  onChange={(e) => {
                                    // Extract username from input (remove URLs, @, etc.)
                                    const value = e.target.value
                                      .replace(/^https?:\/\//, '')
                                      .replace(/^www\./, '')
                                      .replace(/^github\.com\//, '')
                                      .replace(/^@/, '')
                                      .trim();
                                    setUserInfo({
                                      ...userInfo,
                                      social_links: { ...userInfo.social_links, github: value }
                                    });
                                  }}
                                  className="flex-1 px-4 py-2 rounded-lg border"
                                  style={{
                                    backgroundColor: DS.colors.background.card,
                                    borderColor: DS.colors.border.default,
                                    color: DS.colors.text.primary,
                                  }}
                                  placeholder="username"
                                />
                              </div>
                              <div className="flex items-center gap-3">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ color: DS.colors.text.secondary }}>
                                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                                </svg>
                                <input
                                  type="text"
                                  value={userInfo?.social_links?.twitter || ''}
                                  onChange={(e) => {
                                    // Extract username from input
                                    const value = e.target.value
                                      .replace(/^https?:\/\//, '')
                                      .replace(/^www\./, '')
                                      .replace(/^(x|twitter)\.com\//, '')
                                      .replace(/^@/, '')
                                      .trim();
                                    setUserInfo({
                                      ...userInfo,
                                      social_links: { ...userInfo.social_links, twitter: value }
                                    });
                                  }}
                                  className="flex-1 px-4 py-2 rounded-lg border"
                                  style={{
                                    backgroundColor: DS.colors.background.card,
                                    borderColor: DS.colors.border.default,
                                    color: DS.colors.text.primary,
                                  }}
                                  placeholder="username"
                                />
                              </div>
                              <div className="flex items-center gap-3">
                                <Instagram size={20} style={{ color: DS.colors.text.secondary }} />
                                <input
                                  type="text"
                                  value={userInfo?.social_links?.instagram || ''}
                                  onChange={(e) => {
                                    // Extract username from input
                                    const value = e.target.value
                                      .replace(/^https?:\/\//, '')
                                      .replace(/^www\./, '')
                                      .replace(/^instagram\.com\//, '')
                                      .replace(/^@/, '')
                                      .trim();
                                    setUserInfo({
                                      ...userInfo,
                                      social_links: { ...userInfo.social_links, instagram: value }
                                    });
                                  }}
                                  className="flex-1 px-4 py-2 rounded-lg border"
                                  style={{
                                    backgroundColor: DS.colors.background.card,
                                    borderColor: DS.colors.border.default,
                                    color: DS.colors.text.primary,
                                  }}
                                  placeholder="username"
                                />
                              </div>
                              <div className="flex items-center gap-3">
                                <Youtube size={20} style={{ color: DS.colors.text.secondary }} />
                                <input
                                  type="text"
                                  value={userInfo?.social_links?.youtube || ''}
                                  onChange={(e) => {
                                    // Extract username from input
                                    const value = e.target.value
                                      .replace(/^https?:\/\//, '')
                                      .replace(/^www\./, '')
                                      .replace(/^youtube\.com\//, '')
                                      .replace(/^youtube\.com\/@/, '')
                                      .replace(/^@/, '')
                                      .trim();
                                    setUserInfo({
                                      ...userInfo,
                                      social_links: { ...userInfo.social_links, youtube: value }
                                    });
                                  }}
                                  className="flex-1 px-4 py-2 rounded-lg border"
                                  style={{
                                    backgroundColor: DS.colors.background.card,
                                    borderColor: DS.colors.border.default,
                                    color: DS.colors.text.primary,
                                  }}
                                  placeholder="username"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Privacy Setting */}
                          <div className="pt-4 border-t" style={{ borderColor: DS.colors.border.default }}>
                            <div className="flex items-center justify-between">
                              <div>
                                <label className="block text-sm font-medium mb-1" style={{ color: DS.colors.text.primary }}>
                                  Account Privacy
                                </label>
                                <p className="text-xs" style={{ color: DS.colors.text.secondary }}>
                                  {userInfo?.profile_private 
                                    ? 'Your profile is private. Only approved followers can see your content.'
                                    : 'Your profile is public. Anyone can view your profile and projects.'}
                                </p>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={userInfo?.profile_private || false}
                                  onChange={(e) => setUserInfo({ ...userInfo, profile_private: e.target.checked })}
                                  className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                              </label>
                            </div>
                          </div>

                          <Button 
                            variant="primary" 
                            onClick={handleSaveProfile}
                            disabled={saving || !!usernameError}
                            fullWidth
                          >
                            {saving ? 'Saving...' : 'Save Changes'}
                          </Button>
                      </div>
                    </Card>
                    )}
                  </div>
                )}

                {activeTab === 'notifications' && (
                  <div className="space-y-6">
                    {notifMessage && (
                      <div
                        className={`p-4 rounded-lg ${
                          notifMessage.type === 'success'
                            ? 'bg-green-500/10 border border-green-500/20 text-green-500'
                            : 'bg-red-500/10 border border-red-500/20 text-red-500'
                        }`}
                      >
                        {notifMessage.text}
                      </div>
                    )}
                    <Card padding="lg">
                      <h3 className="text-xl font-bold mb-2" style={{ color: DS.colors.text.primary }}>
                        Notification preferences
                      </h3>
                      <p className="text-sm mb-6" style={{ color: DS.colors.text.secondary }}>
                        Choose how we reach you. These are saved to your account and used when we send emails or
                        in-app alerts (comments, follows, and marketplace activity).
                      </p>
                      <div className="space-y-1">
                        {(
                          [
                            {
                              key: 'emailNotifications' as const,
                              label: 'Email notifications',
                              description: 'Security, product updates, and activity summaries by email',
                            },
                            {
                              key: 'pushNotifications' as const,
                              label: 'Browser notifications',
                              description: 'Short desktop alerts while using Blueprint (requires browser permission)',
                            },
                            {
                              key: 'commentsOnDesigns' as const,
                              label: 'Comments on your designs',
                              description: 'When someone comments on your projects',
                            },
                            {
                              key: 'newFollowers' as const,
                              label: 'New followers',
                              description: 'When someone follows your profile',
                            },
                            {
                              key: 'marketplaceUpdates' as const,
                              label: 'Marketplace updates',
                              description: 'Sales, listing status, and buyer activity for your storefront',
                            },
                          ] as const
                        ).map((item) => (
                          <div
                            key={item.key}
                            className="flex items-center justify-between py-3 border-b gap-4"
                            style={{ borderColor: DS.colors.border.default }}
                          >
                            <div className="min-w-0">
                              <div className="font-medium" style={{ color: DS.colors.text.primary }}>
                                {item.label}
                              </div>
                              <div className="text-sm" style={{ color: DS.colors.text.secondary }}>
                                {item.description}
                              </div>
                              {item.key === 'pushNotifications' && pushPermission !== 'unsupported' && (
                                <div className="text-xs mt-1" style={{ color: DS.colors.text.tertiary }}>
                                  Browser permission: {pushPermission}
                                </div>
                              )}
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer shrink-0">
                              <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={notificationPreferences[item.key]}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  if (item.key === 'pushNotifications') {
                                    void handlePushToggle(checked);
                                  } else {
                                    setNotificationPreferences((prev) => ({
                                      ...prev,
                                      [item.key]: checked,
                                    }));
                                  }
                                }}
                              />
                              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                            </label>
                          </div>
                        ))}
                      </div>
                      <div className="mt-6 pt-4 border-t" style={{ borderColor: DS.colors.border.default }}>
                        <Button
                          variant="primary"
                          onClick={() => void saveNotificationPreferences()}
                          disabled={notifSaving}
                          fullWidth
                        >
                          {notifSaving ? 'Saving…' : 'Save notification settings'}
                        </Button>
                      </div>
                    </Card>
                  </div>
                )}

                {activeTab === 'security' && (
                  <div className="space-y-6">
                    <Card padding="lg">
                      <h3 className="text-xl font-bold mb-6" style={{ color: DS.colors.text.primary }}>
                        Security Settings
                      </h3>
                      <div className="space-y-6">
                        <div>
                          <h4 className="font-semibold mb-3" style={{ color: DS.colors.text.primary }}>Change Password</h4>
                          <div className="space-y-3">
                            <input
                              type="password"
                              placeholder="Current password"
                              className="w-full px-4 py-2 rounded-lg border"
                              style={{
                                backgroundColor: DS.colors.background.card,
                                borderColor: DS.colors.border.default,
                                color: DS.colors.text.primary,
                              }}
                            />
                            <input
                              type="password"
                              placeholder="New password"
                              className="w-full px-4 py-2 rounded-lg border"
                              style={{
                                backgroundColor: DS.colors.background.card,
                                borderColor: DS.colors.border.default,
                                color: DS.colors.text.primary,
                              }}
                            />
                            <input
                              type="password"
                              placeholder="Confirm new password"
                              className="w-full px-4 py-2 rounded-lg border"
                              style={{
                                backgroundColor: DS.colors.background.card,
                                borderColor: DS.colors.border.default,
                                color: DS.colors.text.primary,
                              }}
                            />
                            <Button variant="primary">Update Password</Button>
                          </div>
                        </div>
                        <div className="pt-6 border-t" style={{ borderColor: DS.colors.border.default }}>
                          <h4 className="font-semibold mb-3" style={{ color: DS.colors.text.primary }}>Two-Factor Authentication</h4>
                          <p className="text-sm mb-4" style={{ color: DS.colors.text.secondary }}>
                            Add an extra layer of security to your account
                          </p>
                          <Button variant="secondary" icon={<Shield size={18} />}>Enable 2FA</Button>
                        </div>
                      </div>
                    </Card>
                  </div>
                )}

                {activeTab === 'billing' && (
                  <div className="space-y-6">
                    <Card padding="lg">
                      <h3 className="text-xl font-bold mb-6" style={{ color: DS.colors.text.primary }}>
                        Billing & Subscription
                      </h3>
                      <div className="space-y-6">
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h4 className="font-semibold" style={{ color: DS.colors.text.primary }}>Current Plan</h4>
                              <div className="flex items-center gap-2">
                                <TierBadge tier={userSubscription?.tier} size="sm" />
                                <p className="text-sm capitalize" style={{ color: DS.colors.text.secondary }}>
                                  {userSubscription?.tier ? `${userSubscription.tier.charAt(0).toUpperCase() + userSubscription.tier.slice(1)} Plan` : 'Free Plan'}
                                </p>
                              </div>
                              {userSubscription?.subscription && (
                                <p className="text-xs mt-1" style={{ color: DS.colors.text.tertiary }}>
                                  {userSubscription.subscription.cancelAtPeriodEnd 
                                    ? `Cancels on ${new Date(userSubscription.subscription.currentPeriodEnd).toLocaleDateString()}`
                                    : `Renews on ${new Date(userSubscription.subscription.currentPeriodEnd).toLocaleDateString()}`
                                  }
                                </p>
                              )}
                            </div>
                            <Badge 
                              variant={userSubscription?.tier && userSubscription.tier !== 'free' ? 'primary' : 'secondary'} 
                              size="lg"
                            >
                              {userSubscription?.subscription?.status === 'active' ? 'Active' : 'Free'}
                            </Badge>
                          </div>
                          <Link href="/subscription">
                            <Button variant="primary" fullWidth>
                              {userSubscription?.tier && userSubscription.tier !== 'free' ? 'Manage Subscription' : 'Upgrade Plan'}
                            </Button>
                          </Link>
                        </div>
                        {userSubscription?.storage && (
                          <div className="pt-6 border-t" style={{ borderColor: DS.colors.border.default }}>
                            <h4 className="font-semibold mb-3" style={{ color: DS.colors.text.primary }}>Storage Usage</h4>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span style={{ color: DS.colors.text.secondary }}>Used</span>
                                <span style={{ color: DS.colors.text.primary }}>
                                  {formatStorage(userSubscription.storage.used * 1024 * 1024 * 1024)} / {formatStorage(userSubscription.storage.limit * 1024 * 1024 * 1024)}
                                </span>
                              </div>
                              <div
                                className="w-full rounded-full h-2.5 overflow-hidden"
                                style={{
                                  backgroundColor: 'var(--ds-progress-track)',
                                  border: `1px solid ${DS.colors.border.default}`,
                                }}
                              >
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{
                                    width: `${Math.min(userSubscription.storage.percentUsed, 100)}%`,
                                    backgroundColor: userSubscription.storage.percentUsed > 90 
                                      ? DS.colors.accent.error 
                                      : DS.colors.primary.blue
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                        <div className="pt-6 border-t" style={{ borderColor: DS.colors.border.default }}>
                          <h4 className="font-semibold mb-3" style={{ color: DS.colors.text.primary }}>Payment Method</h4>
                          <p className="text-sm mb-4" style={{ color: DS.colors.text.secondary }}>
                            Payment methods are managed through Stripe during checkout
                          </p>
                          <Link href="/subscription">
                            <Button variant="secondary" icon={<CreditCard size={18} />}>
                              Manage Payment Methods
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </Card>
                  </div>
                )}

                {activeTab === 'appearance' && (
                  <div className="space-y-6">
                    <Card padding="lg">
                      <h3 className="text-xl font-bold mb-6" style={{ color: DS.colors.text.primary }}>
                        Appearance Settings
                      </h3>
                      {appearanceMessage && (
                        <div
                          className="mb-4 px-4 py-3 rounded-lg text-sm"
                          style={{
                            backgroundColor:
                              appearanceMessage.type === 'success'
                                ? 'rgba(16, 185, 129, 0.12)'
                                : 'rgba(239, 68, 68, 0.12)',
                            color:
                              appearanceMessage.type === 'success'
                                ? DS.colors.accent.success
                                : DS.colors.accent.error,
                            border: `1px solid ${
                              appearanceMessage.type === 'success'
                                ? 'rgba(16, 185, 129, 0.3)'
                                : 'rgba(239, 68, 68, 0.3)'
                            }`,
                          }}
                        >
                          {appearanceMessage.text}
                        </div>
                      )}
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: DS.colors.text.primary }}>
                            Theme
                          </label>
                          <select
                            value={theme}
                            onChange={(e) => {
                              setTheme(e.target.value as ThemePreference);
                              setAppearanceMessage({ type: 'success', text: 'Theme updated.' });
                              setTimeout(() => setAppearanceMessage(null), 2500);
                            }}
                            className="w-full px-4 py-2 rounded-lg border"
                            style={{
                              backgroundColor: DS.colors.background.card,
                              borderColor: DS.colors.border.default,
                              color: DS.colors.text.primary,
                            }}
                          >
                            <option value="dark">Dark</option>
                            <option value="light">Light</option>
                            <option value="auto">Auto (system)</option>
                          </select>
                          <p className="text-xs mt-2" style={{ color: DS.colors.text.tertiary }}>
                            Applies across the app. Auto follows your device light/dark preference.
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: DS.colors.text.primary }}>
                            Language
                          </label>
                          <select
                            className="w-full px-4 py-2 rounded-lg border"
                            style={{
                              backgroundColor: DS.colors.background.card,
                              borderColor: DS.colors.border.default,
                              color: DS.colors.text.primary,
                            }}
                            disabled
                          >
                            <option>English</option>
                          </select>
                          <p className="text-xs mt-2" style={{ color: DS.colors.text.tertiary }}>
                            Additional languages coming soon.
                          </p>
                        </div>
                        <Button
                          variant="primary"
                          onClick={() => {
                            setAppearanceMessage({ type: 'success', text: 'Appearance preferences saved.' });
                            setTimeout(() => setAppearanceMessage(null), 3000);
                          }}
                        >
                          Save Preferences
                        </Button>
                      </div>
                    </Card>
                  </div>
                )}
              </div>
            </div>
          </PanelContent>
        </CenterPanel>
      }
    />
  );
}
