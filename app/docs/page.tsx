/**
 * Documentation Hub
 */

'use client';

import Link from 'next/link';
import {
  ThreePanelLayout,
  CenterPanel,
  RightPanel,
  PanelHeader,
  PanelContent,
} from '@/components/ui/ThreePanelLayout';
import { GlobalNavSidebar } from '@/components/ui/GlobalNavSidebar';
import { Card } from '@/components/ui/UIComponents';
import { DesignSystem as DS } from '@/backend/lib/ui/design-system';
import { docArticles, docCategories, SUPPORT_EMAIL } from '../../lib/support-content';
import { Book, ChevronRight, Mail } from 'lucide-react';

export default function DocsPage() {
  const grouped = docCategories.map((category) => ({
    category,
    articles: docArticles.filter((doc) => doc.category === category),
  }));

  return (
    <ThreePanelLayout
      leftPanel={<GlobalNavSidebar />}
      centerPanel={
        <CenterPanel>
          <PanelHeader title="Documentation" />
          <PanelContent>
            <div className="max-w-4xl mx-auto py-6">
              <p className="mb-8 text-lg" style={{ color: DS.colors.text.secondary }}>
                Guides and references for using BlueprintCAD — from your first upload to selling on the
                marketplace.
              </p>

              <div className="flex flex-col gap-14">
                {grouped.map(({ category, articles }) => (
                  <div key={category} className="flex flex-col">
                    <h2
                      className="text-xl font-bold mb-5"
                      style={{ color: DS.colors.text.primary }}
                    >
                      {category}
                    </h2>
                    <div className="flex flex-col gap-5">
                      {articles.map((article) => (
                        <Link
                          key={article.slug}
                          href={`/docs/${article.slug}`}
                          className="block"
                        >
                          <Card hover padding="lg" style={{ cursor: 'pointer' }}>
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-start gap-3 min-w-0">
                                <Book
                                  size={20}
                                  className="shrink-0 mt-0.5"
                                  style={{ color: DS.colors.primary.blue }}
                                />
                                <div className="min-w-0">
                                  <h3
                                    className="font-semibold mb-1"
                                    style={{ color: DS.colors.text.primary }}
                                  >
                                    {article.title}
                                  </h3>
                                  <p
                                    className="text-sm truncate"
                                    style={{ color: DS.colors.text.secondary }}
                                  >
                                    {article.description}
                                  </p>
                                </div>
                              </div>
                              <ChevronRight
                                size={18}
                                className="shrink-0"
                                style={{ color: DS.colors.text.secondary }}
                              />
                            </div>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </PanelContent>
        </CenterPanel>
      }
      rightPanel={
        <RightPanel>
          <PanelHeader title="Need Help?" />
          <PanelContent className="p-4 sm:p-6">
            <Card padding="md" className="!rounded-xl">
              <p className="text-sm mb-4" style={{ color: DS.colors.text.secondary }}>
                Can&apos;t find what you&apos;re looking for? Check the Support page or email us
                directly.
              </p>
              <div className="space-y-2">
                <Link
                  href="/support"
                  className="block text-sm p-2 rounded"
                  style={{ color: DS.colors.primary.blue }}
                >
                  Support & FAQ
                </Link>
                {/* Forum link hidden for initial launch */}
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="flex items-center gap-2 text-sm p-2 rounded"
                  style={{ color: DS.colors.primary.blue }}
                >
                  <Mail size={14} />
                  {SUPPORT_EMAIL}
                </a>
              </div>
            </Card>
          </PanelContent>
        </RightPanel>
      }
    />
  );
}
