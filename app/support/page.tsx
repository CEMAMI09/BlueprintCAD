/**
 * Support Page
 * Help center and support resources
 */

'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ThreePanelLayout,
  CenterPanel,
  RightPanel,
  PanelHeader,
  PanelContent,
} from '@/components/ui/ThreePanelLayout';
import { GlobalNavSidebar } from '@/components/ui/GlobalNavSidebar';
import { Button, Card, EmptyState } from '@/components/ui/UIComponents';
import { DesignSystem as DS } from '@/backend/lib/ui/design-system';
import {
  faqCategories,
  faqItems,
  popularArticles,
  searchSupportContent,
  SUPPORT_EMAIL,
} from '../../lib/support-content';
import {
  HelpCircle,
  Book,
  MessageCircle,
  Mail,
  FileText,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Search,
  AlertCircle,
} from 'lucide-react';

const contactOptions = [
  // Community Forum hidden for initial launch — /forum remains accessible via direct URL
  {
    icon: <Mail size={24} />,
    title: 'Email Support',
    description: SUPPORT_EMAIL,
    link: `mailto:${SUPPORT_EMAIL}`,
    external: true,
    action: 'Send email',
  },
  {
    icon: <Book size={24} />,
    title: 'Documentation',
    description: 'Step-by-step guides for every feature',
    link: '/docs',
    external: false,
    action: 'Browse docs',
  },
  {
    icon: <AlertCircle size={24} />,
    title: 'Report an Issue',
    description: 'Submit bugs and track their status',
    link: '/issues',
    external: false,
    action: 'Report issue',
  },
];

export default function SupportPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

  const { faqs: filteredFaqs, docs: filteredDocs } = useMemo(
    () => searchSupportContent(searchQuery),
    [searchQuery]
  );

  const faqsByCategory = useMemo(() => {
    return faqCategories
      .map((category) => ({
        category,
        items: filteredFaqs.filter((item) => item.category === category),
      }))
      .filter((group) => group.items.length > 0);
  }, [filteredFaqs]);

  const toggleFaq = (id: string) => {
    setExpandedFaq((current) => (current === id ? null : id));
  };

  const hasResults = filteredFaqs.length > 0 || filteredDocs.length > 0;

  return (
    <ThreePanelLayout
      leftPanel={<GlobalNavSidebar />}
      centerPanel={
        <CenterPanel>
          <PanelHeader title="Support & Help Center" />
          <PanelContent>
            <div className="max-w-4xl mx-auto py-6">
              {/* Search */}
              <Card padding="lg" className="mb-8">
                <h2 className="text-2xl font-bold mb-4" style={{ color: DS.colors.text.primary }}>
                  How can we help you?
                </h2>
                <div className="relative">
                  <Search
                    size={20}
                    className="absolute left-4 top-1/2 -translate-y-1/2"
                    style={{ color: DS.colors.text.secondary }}
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search FAQs and documentation..."
                    className="w-full pl-12 pr-6 py-4 rounded-lg border text-lg"
                    style={{
                      backgroundColor: DS.colors.background.card,
                      borderColor: DS.colors.border.default,
                      color: DS.colors.text.primary,
                    }}
                  />
                </div>
              </Card>

              {/* Contact Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {contactOptions.map((option) => {
                  const inner = (
                    <Card hover padding="lg" style={{ cursor: 'pointer', height: '100%' }}>
                      <div className="flex items-start gap-4">
                        <div style={{ color: DS.colors.primary.blue }}>{option.icon}</div>
                        <div>
                          <h3 className="font-semibold mb-1" style={{ color: DS.colors.text.primary }}>
                            {option.title}
                          </h3>
                          <p className="text-sm mb-2" style={{ color: DS.colors.text.secondary }}>
                            {option.description}
                          </p>
                          <span
                            className="text-sm flex items-center gap-1"
                            style={{ color: DS.colors.primary.blue }}
                          >
                            {option.action}
                            {option.external ? <ExternalLink size={14} /> : null}
                          </span>
                        </div>
                      </div>
                    </Card>
                  );

                  if (option.external) {
                    return (
                      <a key={option.title} href={option.link} target="_blank" rel="noopener noreferrer">
                        {inner}
                      </a>
                    );
                  }

                  return (
                    <Link key={option.title} href={option.link}>
                      {inner}
                    </Link>
                  );
                })}
              </div>

              {/* Search results: matching docs */}
              {searchQuery && filteredDocs.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-xl font-bold mb-4" style={{ color: DS.colors.text.primary }}>
                    Matching Guides
                  </h2>
                  <div className="space-y-2">
                    {filteredDocs.map((doc) => (
                      <Link key={doc.slug} href={`/docs/${doc.slug}`}>
                        <Card hover padding="md" style={{ cursor: 'pointer' }}>
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-medium" style={{ color: DS.colors.text.primary }}>
                                {doc.title}
                              </span>
                              <p className="text-sm mt-0.5" style={{ color: DS.colors.text.secondary }}>
                                {doc.description}
                              </p>
                            </div>
                            <ChevronDown size={16} style={{ color: DS.colors.text.secondary }} />
                          </div>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* FAQ Categories */}
              <h2 className="text-2xl font-bold mb-6" style={{ color: DS.colors.text.primary }}>
                Frequently Asked Questions
              </h2>

              {!hasResults ? (
                <EmptyState
                  icon={<HelpCircle size={48} />}
                  title="No results found"
                  description={`We couldn't find anything matching "${searchQuery}". Try different keywords or contact us directly.`}
                />
              ) : (
                <div className="space-y-6">
                  {faqsByCategory.map((group) => (
                    <Card key={group.category} padding="lg">
                      <h3 className="font-semibold text-lg mb-4" style={{ color: DS.colors.text.primary }}>
                        {group.category}
                      </h3>
                      <div className="space-y-2">
                        {group.items.map((item) => {
                          const isExpanded = expandedFaq === item.id;
                          return (
                            <div
                              key={item.id}
                              className="rounded-lg border overflow-hidden"
                              style={{ borderColor: DS.colors.border.default }}
                            >
                              <button
                                type="button"
                                onClick={() => toggleFaq(item.id)}
                                className="w-full flex items-center justify-between p-4 text-left transition-colors"
                                style={{
                                  color: DS.colors.text.primary,
                                  backgroundColor: isExpanded
                                    ? DS.colors.background.panelHover
                                    : 'transparent',
                                }}
                              >
                                <span className="font-medium pr-4">{item.question}</span>
                                {isExpanded ? (
                                  <ChevronUp size={18} style={{ color: DS.colors.text.secondary }} />
                                ) : (
                                  <ChevronDown size={18} style={{ color: DS.colors.text.secondary }} />
                                )}
                              </button>
                              {isExpanded && (
                                <div
                                  className="px-4 pb-4"
                                  style={{ color: DS.colors.text.secondary }}
                                >
                                  <p className="leading-relaxed mb-3">{item.answer}</p>
                                  {item.docSlug && (
                                    <Link
                                      href={`/docs/${item.docSlug}`}
                                      className="text-sm inline-flex items-center gap-1"
                                      style={{ color: DS.colors.primary.blue }}
                                    >
                                      Read full guide <ExternalLink size={14} />
                                    </Link>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {/* Still Need Help */}
              <Card padding="lg" className="mt-8 text-center">
                <HelpCircle size={48} style={{ color: DS.colors.primary.blue, margin: '0 auto 16px' }} />
                <h3 className="text-xl font-bold mb-2" style={{ color: DS.colors.text.primary }}>
                  Still need help?
                </h3>
                <p className="mb-4" style={{ color: DS.colors.text.secondary }}>
                  Our support team is here to help. Email us or report an issue and we&apos;ll get back
                  to you within 24 hours on business days.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <a href={`mailto:${SUPPORT_EMAIL}`}>
                    <Button variant="primary" icon={<Mail size={18} />}>
                      Email Support
                    </Button>
                  </a>
                  <Link href="/issues">
                    <Button variant="secondary" icon={<FileText size={18} />}>
                      Report an Issue
                    </Button>
                  </Link>
                </div>
              </Card>
            </div>
          </PanelContent>
        </CenterPanel>
      }
      rightPanel={
        <RightPanel>
          <PanelHeader title="Quick Links" />
          <PanelContent className="p-4 sm:p-6">
            <div className="space-y-6 min-w-0">
              <Card padding="md" className="!rounded-xl">
                <h3 className="font-semibold mb-3" style={{ color: DS.colors.text.primary }}>
                  Popular Articles
                </h3>
                <div className="space-y-2">
                  {popularArticles.map((article) => (
                    <Link
                      key={article.slug}
                      href={`/docs/${article.slug}`}
                      className="block text-sm p-2 rounded transition-colors"
                      style={{ color: DS.colors.primary.blue }}
                    >
                      {article.title}
                    </Link>
                  ))}
                </div>
              </Card>

              <Card padding="md" className="!rounded-xl">
                <h3 className="font-semibold mb-3" style={{ color: DS.colors.text.primary }}>
                  Contact Info
                </h3>
                <div className="space-y-3 text-sm" style={{ color: DS.colors.text.secondary }}>
                  <div>
                    <strong style={{ color: DS.colors.text.primary }}>Email:</strong>
                    <br />
                    <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: DS.colors.primary.blue }}>
                      {SUPPORT_EMAIL}
                    </a>
                  </div>
                  <div>
                    <strong style={{ color: DS.colors.text.primary }}>Hours:</strong>
                    <br />
                    Mon–Fri, 9am–6pm EST
                  </div>
                  {/* Forum link hidden for initial launch */}
                </div>
              </Card>
            </div>
          </PanelContent>
        </RightPanel>
      }
    />
  );
}
