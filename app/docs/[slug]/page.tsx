/**
 * Individual documentation article
 */

'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
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
import { getDocBySlug, docArticles, SUPPORT_EMAIL } from '../../../lib/support-content';
import { ArrowLeft, ChevronRight } from 'lucide-react';

export default function DocArticlePage() {
  const params = useParams();
  const slug = typeof params.slug === 'string' ? params.slug : params.slug?.[0] ?? '';
  const article = getDocBySlug(slug);

  if (!article) {
    return (
      <ThreePanelLayout
        leftPanel={<GlobalNavSidebar />}
        centerPanel={
          <CenterPanel>
            <PanelHeader title="Guide Not Found" />
            <PanelContent>
              <div className="max-w-3xl mx-auto py-6 text-center">
                <p className="mb-4" style={{ color: DS.colors.text.secondary }}>
                  We couldn&apos;t find a guide for &ldquo;{slug}&rdquo;.
                </p>
                <Link href="/docs" style={{ color: DS.colors.primary.blue }}>
                  ← Back to Documentation
                </Link>
              </div>
            </PanelContent>
          </CenterPanel>
        }
      />
    );
  }

  const related = docArticles
    .filter((doc) => doc.category === article.category && doc.slug !== article.slug)
    .slice(0, 3);

  return (
    <ThreePanelLayout
      leftPanel={<GlobalNavSidebar />}
      centerPanel={
        <CenterPanel>
          <PanelHeader title={article.title} />
          <PanelContent>
            <div className="max-w-3xl mx-auto py-6">
              <Link
                href="/docs"
                className="inline-flex items-center gap-2 text-sm mb-6 transition-opacity hover:opacity-80"
                style={{ color: DS.colors.primary.blue }}
              >
                <ArrowLeft size={16} />
                Back to Documentation
              </Link>

              <p className="text-lg mb-8" style={{ color: DS.colors.text.secondary }}>
                {article.description}
              </p>

              <Card padding="lg">
                <div>
                  {article.sections.map((section, index) => (
                    <div
                      key={index}
                      className={
                        index < article.sections.length - 1
                          ? 'pb-10 mb-10 border-b'
                          : ''
                      }
                      style={
                        index < article.sections.length - 1
                          ? { borderColor: DS.colors.border.default }
                          : undefined
                      }
                    >
                      {section.heading && (
                        <h2
                          className="text-lg font-semibold mb-4"
                          style={{ color: DS.colors.text.primary }}
                        >
                          {section.heading}
                        </h2>
                      )}
                      <p
                        className="leading-relaxed mb-4"
                        style={{ color: DS.colors.text.secondary }}
                      >
                        {section.body}
                      </p>
                      {section.bullets && section.bullets.length > 0 && (
                        <ul className="list-disc pl-5 space-y-2.5">
                          {section.bullets.map((bullet, i) => (
                            <li
                              key={i}
                              className="leading-relaxed"
                              style={{ color: DS.colors.text.secondary }}
                            >
                              {bullet}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </Card>

              <div className="mt-8 text-center">
                <p className="text-sm mb-2" style={{ color: DS.colors.text.secondary }}>
                  Still have questions?
                </p>
                <Link
                  href="/support"
                  className="text-sm font-medium"
                  style={{ color: DS.colors.primary.blue }}
                >
                  Visit Support & FAQ
                </Link>
                <span className="mx-2" style={{ color: DS.colors.text.secondary }}>
                  or
                </span>
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="text-sm font-medium"
                  style={{ color: DS.colors.primary.blue }}
                >
                  email us
                </a>
              </div>
            </div>
          </PanelContent>
        </CenterPanel>
      }
      rightPanel={
        <RightPanel>
          <PanelHeader title="Related Guides" />
          <PanelContent className="p-4 sm:p-6">
            {related.length > 0 ? (
              <div className="flex flex-col gap-4">
                {related.map((doc) => (
                  <Link key={doc.slug} href={`/docs/${doc.slug}`} className="block">
                    <Card hover padding="md" className="!rounded-xl" style={{ cursor: 'pointer' }}>
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className="text-sm font-medium"
                          style={{ color: DS.colors.text.primary }}
                        >
                          {doc.title}
                        </span>
                        <ChevronRight size={14} style={{ color: DS.colors.text.secondary }} />
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm" style={{ color: DS.colors.text.secondary }}>
                Browse all guides on the{' '}
                <Link href="/docs" style={{ color: DS.colors.primary.blue }}>
                  documentation hub
                </Link>
                .
              </p>
            )}
          </PanelContent>
        </RightPanel>
      }
    />
  );
}
