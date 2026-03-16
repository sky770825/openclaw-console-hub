import { useEffect, useMemo, useState } from 'react';
import { PageContainer, SectionHeader, Section } from '@/components/layout/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { getDomains } from '@/services/api';

type Domain = { slug: string; label: string; keywords: string[] };

const KB_ROOT = '/Users/caijunchang/Desktop/小蔡/知識庫/SOP-資訊庫';

function copy(text: string) {
  try {
    navigator.clipboard?.writeText(text);
    toast.success('已複製');
  } catch {
    toast.error('複製失敗');
  }
}

export default function DomainsPage() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [q, setQ] = useState('');

  useEffect(() => {
    (async () => {
      const res = await getDomains();
      if (!res?.ok) return;
      setDomains(res.domains ?? []);
    })();
  }, []);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return domains;
    return domains.filter((d) => {
      if (d.slug.toLowerCase().includes(query)) return true;
      if (d.label.toLowerCase().includes(query)) return true;
      return (d.keywords ?? []).some((k) => String(k).toLowerCase().includes(query));
    });
  }, [domains, q]);

  return (
    <PageContainer>
      <SectionHeader
        title="領域分類（Domains）"
        description="任務看板主分類：以 tags 的 `domain:<slug>` 表示（最多一個）"
        icon="🏷️"
        action={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => copy(KB_ROOT)}>
              複製 SOP 路徑
            </Button>
          </div>
        }
      />

      <Section>
        <div className="flex items-center gap-2 mb-4">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜尋：網路 / 資安 / SOP / jwt / k8s ..."
            className="max-w-md"
          />
          <Badge variant="secondary">{filtered.length} / {domains.length}</Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((d) => (
            <Card key={d.slug} className="overflow-hidden">
              <CardHeader className="space-y-1">
                <CardTitle className="flex items-center justify-between gap-2">
                  <span className="truncate">{d.label}</span>
                  <Badge variant="outline" className="font-mono text-xs">
                    domain:{d.slug}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {(d.keywords ?? []).slice(0, 12).map((k) => (
                    <Badge key={k} variant="secondary" className="text-xs">
                      {k}
                    </Badge>
                  ))}
                  {(d.keywords ?? []).length > 12 && (
                    <Badge variant="secondary" className="text-xs">
                      +{(d.keywords ?? []).length - 12}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => copy(`domain:${d.slug}`)}>
                    複製標籤
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => copy(`${KB_ROOT}/RESOURCES/RESOURCES.md`)}
                  >
                    複製資源檔路徑
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>
    </PageContainer>
  );
}

