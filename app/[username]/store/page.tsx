/**
 * Public Storefront Page
 * Route: /[username]/store
 * Displays a user's public storefront with products, about section, reviews
 */

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ThreePanelLayout,
  CenterPanel,
  RightPanel,
  PanelHeader,
  PanelContent,
} from '@/components/ui/ThreePanelLayout';
import { GlobalNavSidebar } from '@/components/ui/GlobalNavSidebar';
import { Button, Card, Badge, SearchBar } from '@/components/ui/UIComponents';
import { DesignSystem as DS } from '@/backend/lib/ui/design-system';
import {
  Store,
  Star,
  DollarSign,
  ShoppingCart,
  UserPlus,
  UserMinus,
  MessageCircle,
  TrendingUp,
  Calendar,
  Award,
  CheckCircle,
  Search,
  Filter,
  Grid3x3,
  List,
  Github,
  Twitter,
  Instagram,
  Youtube,
  Globe,
} from 'lucide-react';

interface Product {
  id: number;
  title: string;
  description: string;
  price: number;
  thumbnail_path: string | null;
  sales_count: number;
  average_rating: number;
  review_count: number;
  created_at: string;
  available_licenses: Array<{
    type: string;
    name: string;
    price: number;
  }>;
}

interface Storefront {
  id: number;
  store_name: string;
  tagline: string;
  description: string;
  banner_image: string | null;
  logo: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  bio: string | null;
  skills: string[] | null;
  social_links: {
    github?: string;
    twitter?: string;
    instagram?: string;
    youtube?: string;
    website?: string;
  } | null;
  refund_policy: string | null;
  license_summary: string | null;
  pinned_products: number[] | null;
  featured_projects: number[] | null;
}

interface Review {
  id: number;
  rating: number;
  review_text: string | null;
  reviewer: {
    username: string;
    profile_picture: string | null;
  };
  is_verified_buyer: boolean;
  created_at: string;
  product_title: string;
}

interface StorefrontOwner {
  id: number;
  username: string;
  profile_picture: string | null;
  created_at: string;
  is_verified: boolean;
}

export default function PublicStorefrontPage() {
  const params = useParams();
  const router = useRouter();
  const username = params?.username as string;
  
  const [storefront, setStorefront] = useState<Storefront | null>(null);
  const [owner, setOwner] = useState<StorefrontOwner | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'best_sellers' | 'price' | 'rating'>('newest');
  const [activeSection, setActiveSection] = useState<'products' | 'about' | 'reviews'>('products');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setCurrentUser(JSON.parse(userData));
    }
    fetchStorefront();
  }, [username]);

  const fetchStorefront = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/storefront/${username}`);
      if (res.ok) {
        const data = await res.json();
        setStorefront(data.storefront);
        setOwner(data.owner);
        setProducts(data.products || []);
        setReviews(data.reviews || []);
        setFollowing(data.following || false);
      } else if (res.status === 404) {
        // Storefront doesn't exist
        setStorefront(null);
      }
    } catch (error) {
      console.error('Error fetching storefront:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!currentUser) {
      router.push('/login');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/${username}/follow`, {
        method: following ? 'DELETE' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (res.ok) {
        setFollowing(!following);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  };

  const handleContact = async () => {
    if (!currentUser) {
      router.push('/login');
      return;
    }

    router.push(`/messages?with=${username}&storefront=true`);
  };

  const handleBuy = (product: Product, licenseType?: string) => {
    const checkoutData = {
      type: 'digital',
      projectId: product.id,
      title: product.title,
      price: licenseType 
        ? product.available_licenses.find(l => l.type === licenseType)?.price || product.price
        : product.price,
      licenseType: licenseType || product.available_licenses[0]?.type,
      sellerUsername: username,
    };
    
    sessionStorage.setItem('checkoutData', JSON.stringify(checkoutData));
    router.push('/checkout');
  };

  const filteredAndSortedProducts = products
    .filter(p => 
      searchQuery === '' || 
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'best_sellers':
          return (b.sales_count || 0) - (a.sales_count || 0);
        case 'price':
          return a.price - b.price;
        case 'rating':
          return (b.average_rating || 0) - (a.average_rating || 0);
        case 'newest':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

  if (loading) {
    return (
      <ThreePanelLayout
        leftPanel={<GlobalNavSidebar />}
        centerPanel={
          <CenterPanel>
            <PanelContent>
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
              </div>
            </PanelContent>
          </CenterPanel>
        }
      />
    );
  }

  if (!storefront) {
    // If it's the user's own storefront, show configuration option
    const isOwnStorefront = currentUser?.username === username;
    if (isOwnStorefront) {
      return (
        <ThreePanelLayout
          leftPanel={<GlobalNavSidebar />}
          centerPanel={
            <CenterPanel>
              <PanelHeader title="Configure Your Storefront" />
              <PanelContent className="!pt-24 !pb-24">
                <div 
                  className="text-center max-w-2xl mx-auto px-8" 
                  style={{ 
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    minHeight: '100%'
                  }}
                >
                  <div className="mb-12">
                    <Store size={64} className="mx-auto mb-8" style={{ color: DS.colors.text.tertiary }} />
                    <h2 className="text-2xl font-bold mb-6" style={{ color: DS.colors.text.primary }}>
                      Your Storefront Isn't Set Up Yet
                    </h2>
                    <p className="text-lg leading-relaxed" style={{ color: DS.colors.text.secondary }}>
                      Create a custom storefront to showcase and sell your designs. Customize your store name, banner, colors, and more.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-4 mt-12">
                    <Button 
                      variant="primary" 
                      icon={<Store size={18} />}
                      onClick={() => router.push('/storefront')}
                    >
                      Configure Storefront
                    </Button>
                    <Link href={`/profile/${username}`}>
                      <Button variant="secondary">
                        Back to Profile
                      </Button>
                    </Link>
                  </div>
                </div>
              </PanelContent>
            </CenterPanel>
          }
        />
      );
    }
    
    // If it's someone else's storefront, show not found message
    return (
      <ThreePanelLayout
        leftPanel={<GlobalNavSidebar />}
        centerPanel={
          <CenterPanel>
            <PanelHeader title="Storefront Not Found" />
            <PanelContent>
              <div className="text-center py-12">
                <p style={{ color: DS.colors.text.secondary }}>
                  This user hasn't set up a storefront yet.
                </p>
                <Link href={`/profile/${username}`}>
                  <Button variant="secondary" className="mt-4">
                    View Profile
                  </Button>
                </Link>
              </div>
            </PanelContent>
          </CenterPanel>
        }
      />
    );
  }

  const pinnedProducts = products.filter(p => storefront.pinned_products?.includes(p.id));
  const regularProducts = products.filter(p => !storefront.pinned_products?.includes(p.id));

  return (
    <ThreePanelLayout
      leftPanel={<GlobalNavSidebar />}
      centerPanel={
        <CenterPanel>
          {/* Banner */}
          <div
            className="w-full h-64 relative"
            style={{
              backgroundColor: storefront.primary_color,
            }}
          >
            {storefront.banner_image && (
              <img
                src={storefront.banner_image}
                alt="Banner"
                className="w-full h-full object-cover"
              />
            )}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
              <div className="flex items-end gap-4">
                {storefront.logo && (
                  <img
                    src={storefront.logo}
                    alt="Logo"
                    className="w-24 h-24 rounded-full border-4 border-white object-cover"
                  />
                )}
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-white mb-1">
                    {storefront.store_name}
                  </h1>
                  {storefront.tagline && (
                    <p className="text-white/90 text-lg">{storefront.tagline}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="border-b" style={{ borderColor: DS.colors.border.subtle }}>
            <div className="flex gap-6 px-6">
              <button
                onClick={() => setActiveSection('products')}
                className="py-4 px-2 border-b-2 font-medium transition-colors"
                style={{
                  borderColor: activeSection === 'products' ? storefront.primary_color : 'transparent',
                  color: activeSection === 'products' ? DS.colors.text.primary : DS.colors.text.secondary,
                }}
              >
                Products
              </button>
              <button
                onClick={() => setActiveSection('about')}
                className="py-4 px-2 border-b-2 font-medium transition-colors"
                style={{
                  borderColor: activeSection === 'about' ? storefront.primary_color : 'transparent',
                  color: activeSection === 'about' ? DS.colors.text.primary : DS.colors.text.secondary,
                }}
              >
                About
              </button>
              <button
                onClick={() => setActiveSection('reviews')}
                className="py-4 px-2 border-b-2 font-medium transition-colors"
                style={{
                  borderColor: activeSection === 'reviews' ? storefront.primary_color : 'transparent',
                  color: activeSection === 'reviews' ? DS.colors.text.primary : DS.colors.text.secondary,
                }}
              >
                Reviews ({reviews.length})
              </button>
            </div>
          </div>

          <PanelContent className="p-6">
            {activeSection === 'products' && (
              <>
                {/* Search and Sort */}
                <div className="flex gap-4 mb-6">
                  <div className="flex-1">
                    <SearchBar
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search products..."
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                      icon={viewMode === 'grid' ? <List size={18} /> : <Grid3x3 size={18} />}
                    />
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="px-4 py-2 rounded-lg border"
                      style={{
                        backgroundColor: DS.colors.background.card,
                        borderColor: DS.colors.border.default,
                        color: DS.colors.text.primary,
                      }}
                    >
                      <option value="newest">Newest</option>
                      <option value="best_sellers">Best Sellers</option>
                      <option value="price">Price: Low to High</option>
                      <option value="rating">Highest Rated</option>
                    </select>
                  </div>
                </div>

                {/* Pinned Products */}
                {pinnedProducts.length > 0 && (
                  <div className="mb-8">
                    <h2 className="text-xl font-semibold mb-4" style={{ color: DS.colors.text.primary }}>
                      Pinned Products
                    </h2>
                    <div className={viewMode === 'grid' ? 'grid grid-cols-3 gap-4' : 'space-y-4'}>
                      {pinnedProducts.map((product) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          viewMode={viewMode}
                          onBuy={handleBuy}
                          primaryColor={storefront.primary_color}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Regular Products */}
                <div>
                  {pinnedProducts.length > 0 && (
                    <h2 className="text-xl font-semibold mb-4" style={{ color: DS.colors.text.primary }}>
                      All Products
                    </h2>
                  )}
                  {filteredAndSortedProducts.length === 0 ? (
                    <div className="text-center py-12" style={{ color: DS.colors.text.secondary }}>
                      No products found
                    </div>
                  ) : (
                    <div className={viewMode === 'grid' ? 'grid grid-cols-3 gap-4' : 'space-y-4'}>
                      {filteredAndSortedProducts.map((product) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          viewMode={viewMode}
                          onBuy={handleBuy}
                          primaryColor={storefront.primary_color}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {activeSection === 'about' && (
              <div className="space-y-6">
                {storefront.description && (
                  <Card padding="lg">
                    <h3 className="text-lg font-semibold mb-3" style={{ color: DS.colors.text.primary }}>
                      About
                    </h3>
                    <p style={{ color: DS.colors.text.secondary }}>{storefront.description}</p>
                  </Card>
                )}

                {storefront.bio && (
                  <Card padding="lg">
                    <h3 className="text-lg font-semibold mb-3" style={{ color: DS.colors.text.primary }}>
                      Bio
                    </h3>
                    <p style={{ color: DS.colors.text.secondary }}>{storefront.bio}</p>
                  </Card>
                )}

                {storefront.skills && storefront.skills.length > 0 && (
                  <Card padding="lg">
                    <h3 className="text-lg font-semibold mb-3" style={{ color: DS.colors.text.primary }}>
                      Skills
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {storefront.skills.map((skill, idx) => (
                        <Badge key={idx} variant="secondary">{skill}</Badge>
                      ))}
                    </div>
                  </Card>
                )}

                {owner && (
                  <Card padding="lg">
                    <h3 className="text-lg font-semibold mb-3" style={{ color: DS.colors.text.primary }}>
                      Seller Information
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Calendar size={16} style={{ color: DS.colors.text.tertiary }} />
                        <span style={{ color: DS.colors.text.secondary }}>
                          Active since {new Date(owner.created_at).getFullYear()}
                        </span>
                      </div>
                      {owner.is_verified && (
                        <div className="flex items-center gap-2">
                          <CheckCircle size={16} style={{ color: DS.colors.accent.success }} />
                          <span style={{ color: DS.colors.text.secondary }}>Verified Seller</span>
                        </div>
                      )}
                    </div>
                  </Card>
                )}

                {storefront.social_links && (
                  <Card padding="lg">
                    <h3 className="text-lg font-semibold mb-3" style={{ color: DS.colors.text.primary }}>
                      Social Links
                    </h3>
                    <div className="flex gap-4">
                      {storefront.social_links.github && (
                        <a
                          href={storefront.social_links.github}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2"
                          style={{ color: DS.colors.text.secondary }}
                        >
                          <Github size={20} />
                          <span>GitHub</span>
                        </a>
                      )}
                      {storefront.social_links.twitter && (
                        <a
                          href={storefront.social_links.twitter}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2"
                          style={{ color: DS.colors.text.secondary }}
                        >
                          <Twitter size={20} />
                          <span>Twitter</span>
                        </a>
                      )}
                      {storefront.social_links.instagram && (
                        <a
                          href={storefront.social_links.instagram}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2"
                          style={{ color: DS.colors.text.secondary }}
                        >
                          <Instagram size={20} />
                          <span>Instagram</span>
                        </a>
                      )}
                      {storefront.social_links.youtube && (
                        <a
                          href={storefront.social_links.youtube}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2"
                          style={{ color: DS.colors.text.secondary }}
                        >
                          <Youtube size={20} />
                          <span>YouTube</span>
                        </a>
                      )}
                      {storefront.social_links.website && (
                        <a
                          href={storefront.social_links.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2"
                          style={{ color: DS.colors.text.secondary }}
                        >
                          <Globe size={20} />
                          <span>Website</span>
                        </a>
                      )}
                    </div>
                  </Card>
                )}

                {storefront.refund_policy && (
                  <Card padding="lg">
                    <h3 className="text-lg font-semibold mb-3" style={{ color: DS.colors.text.primary }}>
                      Refund Policy
                    </h3>
                    <p style={{ color: DS.colors.text.secondary }}>{storefront.refund_policy}</p>
                  </Card>
                )}

                {storefront.license_summary && (
                  <Card padding="lg">
                    <h3 className="text-lg font-semibold mb-3" style={{ color: DS.colors.text.primary }}>
                      License Summary
                    </h3>
                    <p style={{ color: DS.colors.text.secondary }}>{storefront.license_summary}</p>
                  </Card>
                )}
              </div>
            )}

            {activeSection === 'reviews' && (
              <div className="space-y-4">
                {reviews.length === 0 ? (
                  <div className="text-center py-12" style={{ color: DS.colors.text.secondary }}>
                    No reviews yet
                  </div>
                ) : (
                  reviews.map((review) => (
                    <Card key={review.id} padding="lg">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          {review.reviewer.profile_picture ? (
                            <img
                              src={`/api/users/profile-picture/${review.reviewer.profile_picture}`}
                              alt={review.reviewer.username}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <div
                              className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold"
                              style={{ backgroundColor: DS.colors.primary.blue, color: '#fff' }}
                            >
                              {review.reviewer.username[0].toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold" style={{ color: DS.colors.text.primary }}>
                              {review.reviewer.username}
                            </span>
                            {review.is_verified_buyer && (
                              <Badge variant="success" size="sm">
                                <CheckCircle size={12} className="mr-1" />
                                Verified Buyer
                              </Badge>
                            )}
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  size={14}
                                  fill={i < review.rating ? '#fbbf24' : 'none'}
                                  style={{ color: i < review.rating ? '#fbbf24' : DS.colors.text.tertiary }}
                                />
                              ))}
                            </div>
                          </div>
                          <p className="text-sm mb-1" style={{ color: DS.colors.text.secondary }}>
                            {review.product_title}
                          </p>
                          {review.review_text && (
                            <p style={{ color: DS.colors.text.primary }}>{review.review_text}</p>
                          )}
                          <p className="text-xs mt-2" style={{ color: DS.colors.text.tertiary }}>
                            {new Date(review.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            )}
          </PanelContent>
        </CenterPanel>
      }
      rightPanel={
        <RightPanel>
          <PanelHeader title="Actions" />
          <PanelContent className="p-6 space-y-4">
            <Button
              variant={following ? "secondary" : "primary"}
              fullWidth
              onClick={handleFollow}
              icon={following ? <UserMinus size={18} /> : <UserPlus size={18} />}
            >
              {following ? 'Unfollow' : 'Follow'}
            </Button>
            <Button
              variant="secondary"
              fullWidth
              onClick={handleContact}
              icon={<MessageCircle size={18} />}
            >
              Contact Seller
            </Button>
            <Link href={`/profile/${username}`}>
              <Button variant="ghost" fullWidth>
                View Profile
              </Button>
            </Link>
          </PanelContent>
        </RightPanel>
      }
    />
  );
}

function ProductCard({ product, viewMode, onBuy, primaryColor }: {
  product: Product;
  viewMode: 'grid' | 'list';
  onBuy: (product: Product, licenseType?: string) => void;
  primaryColor: string;
}) {
  const [showLicenseModal, setShowLicenseModal] = useState(false);

  if (viewMode === 'list') {
    return (
      <Card padding="md" hover>
        <div className="flex gap-4">
          <div className="w-32 h-32 rounded-lg overflow-hidden flex-shrink-0">
            {product.thumbnail_path ? (
              <img
                src={`/api/thumbnails/${encodeURIComponent(product.thumbnail_path.split('/').pop() || '')}`}
                alt={product.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: '#1a1a1a' }}>
                <span className="text-4xl">📦</span>
              </div>
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold mb-1" style={{ color: DS.colors.text.primary }}>
              {product.title}
            </h3>
            <p className="text-sm mb-2 line-clamp-2" style={{ color: DS.colors.text.secondary }}>
              {product.description}
            </p>
            <div className="flex items-center gap-4 text-sm mb-3">
              <div className="flex items-center gap-1">
                <Star size={14} fill="#fbbf24" style={{ color: '#fbbf24' }} />
                <span style={{ color: DS.colors.text.secondary }}>
                  {product.average_rating.toFixed(1)} ({product.review_count})
                </span>
              </div>
              <div style={{ color: DS.colors.text.secondary }}>
                {product.sales_count} sales
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg" style={{ color: DS.colors.text.primary }}>
                ${product.price.toFixed(2)}
              </span>
              {product.available_licenses.length > 1 && (
                <span className="text-sm" style={{ color: DS.colors.text.secondary }}>
                  (Multiple licenses available)
                </span>
              )}
            </div>
          </div>
          <div className="flex-shrink-0">
            <Button
              variant="primary"
              onClick={() => {
                if (product.available_licenses.length > 1) {
                  setShowLicenseModal(true);
                } else {
                  onBuy(product, product.available_licenses[0]?.type);
                }
              }}
            >
              Buy Now
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card padding="none" hover className="cursor-pointer" onClick={() => window.location.href = `/project/${product.id}`}>
      <div className="aspect-video rounded-t-lg overflow-hidden relative" style={{ backgroundColor: '#1a1a1a' }}>
        {product.thumbnail_path ? (
          <img
            src={`/api/thumbnails/${encodeURIComponent(product.thumbnail_path.split('/').pop() || '')}`}
            alt={product.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-5xl">📦</span>
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold mb-1" style={{ color: DS.colors.text.primary }}>
          {product.title}
        </h3>
        <div className="flex items-center gap-2 mb-2">
          <div className="flex items-center gap-1">
            <Star size={12} fill="#fbbf24" style={{ color: '#fbbf24' }} />
            <span className="text-xs" style={{ color: DS.colors.text.secondary }}>
              {product.average_rating.toFixed(1)}
            </span>
          </div>
          <span className="text-xs" style={{ color: DS.colors.text.secondary }}>
            • {product.sales_count} sales
          </span>
        </div>
        <div className="flex items-center justify-between mt-3">
          <span className="font-bold" style={{ color: DS.colors.text.primary }}>
            ${product.price.toFixed(2)}
          </span>
          <Button
            variant="primary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              if (product.available_licenses.length > 1) {
                setShowLicenseModal(true);
              } else {
                onBuy(product, product.available_licenses[0]?.type);
              }
            }}
          >
            Buy
          </Button>
        </div>
      </div>
    </Card>
  );
}

