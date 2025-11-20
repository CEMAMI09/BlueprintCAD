/**
 * Support Page
 * Help center and support resources
 */

'use client';

import { useState } from 'react';
import {
  ThreePanelLayout,
  CenterPanel,
  RightPanel,
  PanelHeader,
  PanelContent,
} from '@/components/ui/ThreePanelLayout';
import { GlobalNavSidebar } from '@/components/ui/GlobalNavSidebar';
import { Button, Card, Badge, SearchBar, EmptyState } from '@/components/ui/UIComponents';
import { DesignSystem as DS } from '@/lib/ui/design-system';
import {
  HelpCircle,
  Book,
  MessageCircle,
  Mail,
  Phone,
  FileText,
  Video,
  ExternalLink,
} from 'lucide-react';

export default function SupportPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const faqCategories = [
    {
      title: 'Getting Started',
      items: [
        { question: 'How do I create my first CAD design?', link: '/docs/getting-started' },
        { question: 'What file formats are supported?', link: '/docs/file-formats' },
        { question: 'How do I share my designs?', link: '/docs/sharing' },
      ],
    },
    {
      title: 'CAD Editor',
      items: [
        { question: 'How to use parametric modeling?', link: '/docs/parametric' },
        { question: 'Exporting to STEP/STL files', link: '/docs/export' },
        { question: 'Using constraints and dimensions', link: '/docs/constraints' },
      ],
    },
    {
      title: 'Marketplace',
      items: [
        { question: 'How to sell my designs?', link: '/docs/selling' },
        { question: 'Payment and pricing', link: '/docs/payments' },
        { question: 'Licensing options', link: '/docs/licensing' },
      ],
    },
  ];

  const contactOptions = [
    { icon: <MessageCircle size={24} />, title: 'Community Forum', description: 'Get help from other users', link: '/forum' },
    { icon: <Mail size={24} />, title: 'Email Support', description: 'support@blueprintcad.com', link: 'mailto:support@blueprintcad.com' },
    { icon: <Book size={24} />, title: 'Documentation', description: 'Comprehensive guides and tutorials', link: '/docs' },
    { icon: <Video size={24} />, title: 'Video Tutorials', description: 'Watch step-by-step guides', link: '/tutorials' },
  ];

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
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for help articles..."
                  className="w-full px-6 py-4 rounded-lg border text-lg"
                  style={{
                    backgroundColor: DS.colors.background.card,
                    borderColor: DS.colors.border.default,
                    color: DS.colors.text.primary,
                  }}
                />
              </Card>

              {/* Contact Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {contactOptions.map((option) => (
                  <Card key={option.title} hover padding="lg" style={{ cursor: 'pointer' }}>
                    <div className="flex items-start gap-4">
                      <div style={{ color: DS.colors.primary.blue }}>{option.icon}</div>
                      <div>
                        <h3 className="font-semibold mb-1" style={{ color: DS.colors.text.primary }}>
                          {option.title}
                        </h3>
                        <p className="text-sm mb-2" style={{ color: DS.colors.text.secondary }}>
                          {option.description}
                        </p>
                        <a
                          href={option.link}
                          className="text-sm flex items-center gap-1"
                          style={{ color: DS.colors.primary.blue }}
                        >
                          Learn more <ExternalLink size={14} />
                        </a>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* FAQ Categories */}
              <h2 className="text-2xl font-bold mb-6" style={{ color: DS.colors.text.primary }}>
                Frequently Asked Questions
              </h2>
              <div className="space-y-6">
                {faqCategories.map((category) => (
                  <Card key={category.title} padding="lg">
                    <h3 className="font-semibold text-lg mb-4" style={{ color: DS.colors.text.primary }}>
                      {category.title}
                    </h3>
                    <div className="space-y-3">
                      {category.items.map((item) => (
                        <a
                          key={item.question}
                          href={item.link}
                          className="block p-3 rounded-lg transition-colors"
                          style={{
                            color: DS.colors.text.primary,
                            backgroundColor: 'transparent',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = DS.colors.background.panelHover)}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          <div className="flex items-center justify-between">
                            <span>{item.question}</span>
                            <ExternalLink size={16} style={{ color: DS.colors.text.secondary }} />
                          </div>
                        </a>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>

              {/* Still Need Help */}
              <Card padding="lg" className="mt-8 text-center">
                <HelpCircle size={48} style={{ color: DS.colors.primary.blue, margin: '0 auto 16px' }} />
                <h3 className="text-xl font-bold mb-2" style={{ color: DS.colors.text.primary }}>
                  Still need help?
                </h3>
                <p className="mb-4" style={{ color: DS.colors.text.secondary }}>
                  Our support team is here to help you with any questions or issues.
                </p>
                <Button variant="primary" icon={<Mail size={18} />}>
                  Contact Support
                </Button>
              </Card>
            </div>
          </PanelContent>
        </CenterPanel>
      }
      rightPanel={
        <RightPanel>
          <PanelHeader title="Quick Links" />
          <PanelContent>
            <div className="space-y-4">
              <Card padding="md">
                <h3 className="font-semibold mb-3" style={{ color: DS.colors.text.primary }}>
                  Popular Articles
                </h3>
                <div className="space-y-2">
                  {['Getting Started Guide', 'CAD Basics', 'Exporting Files', 'Pricing Plans'].map((article) => (
                    <a
                      key={article}
                      href="#"
                      className="block text-sm p-2 rounded"
                      style={{ color: DS.colors.primary.blue }}
                    >
                      {article}
                    </a>
                  ))}
                </div>
              </Card>

              <Card padding="md">
                <h3 className="font-semibold mb-3" style={{ color: DS.colors.text.primary }}>
                  Contact Info
                </h3>
                <div className="space-y-3 text-sm" style={{ color: DS.colors.text.secondary }}>
                  <div>
                    <strong style={{ color: DS.colors.text.primary }}>Email:</strong>
                    <br />
                    support@blueprintcad.com
                  </div>
                  <div>
                    <strong style={{ color: DS.colors.text.primary }}>Hours:</strong>
                    <br />
                    Mon-Fri 9am-6pm EST
                  </div>
                </div>
              </Card>
            </div>
          </PanelContent>
        </RightPanel>
      }
    />
  );
}
