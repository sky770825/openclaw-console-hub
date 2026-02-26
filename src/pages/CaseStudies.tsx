import { motion } from 'framer-motion';
import {
  Building2,
  UtensilsCrossed,
  ShoppingBag,
  TrendingUp,
  Users,
  Clock,
  CheckCircle2,
  ArrowRight,
  Quote,
} from 'lucide-react';
import { PageContainer, SectionHeader } from '@/components/layout/PageContainer';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CaseStudy {
  id: string;
  industry: string;
  clientName: string;
  icon: React.ReactNode;
  background: string;
  problem: string;
  solution: string[];
  results: {
    metric: string;
    value: string;
    improvement: string;
  }[];
  testimonial: string;
  color: string;
}

const caseStudies: CaseStudy[] = [
  {
    id: 'restaurant',
    industry: '餐飲業',
    clientName: '小確幸咖啡輕食',
    icon: <UtensilsCrossed className="w-6 h-6" />,
    background: '台中某商圈的輕食咖啡廳，開業兩年，客群以附近上班族為主。每日午餐時段客流量大，但離峰時段閒置率高，整體營收難以突破。',
    problem: '• 離峰時段（下午 2-5 點）客流量僅有尖峰時段的 20%\n• 缺乏精準行銷工具，促銷活動響應率低\n• 人力配置無法彈性調整，造成浪費',
    solution: [
      '部署 NEUXA 990 智能分析系統，分析顛客消費模式',
      '自動推送個人化優惠（離峰時段專屬套餐）',
      '導入智能排班建議，優化人力配置',
    ],
    results: [
      { metric: '離峰營收', value: '+150%', improvement: '透過精準促銷，離峰時段營收成長 150%' },
      { metric: '顛客回流', value: '+45%', improvement: '個人化推播帶來顛客回流率提升 45%' },
      { metric: '人力成本', value: '-20%', improvement: '智能排班減少不必要的人力支出' },
    ],
    testimonial: '以前下午時段總是空蕩蕩的，現在透過 990 的智能推播，客人會在離峰時段收到專屬優惠，整體營收提升了許多！',
    color: 'from-orange-500/20 to-amber-500/20',
  },
  {
    id: 'realestate',
    industry: '房仲業',
    clientName: '安心房屋仲介',
    icon: <Building2 className="w-6 h-6" />,
    background: '桃園地區中型房仲公司，擁有 15 位房仲專員。每月平均 50 組帶看，但成交轉換率偏低，且房仲花費大量時間在行政工作上。',
    problem: '• 客戶跟進管理混亂，容易遺漏潛在買家\n• 房源文案撰寫耗時，品質不一\n• 市場分析報告製作費時，無法即時提供給客戶',
    solution: [
      '導入 990 客戶關係管理系統，自動化跟進流程',
      '使用 AI 房源文案生成器，一鍵產生專業文案',
      '自動化區域房價分析報告，即時掌握市場動態',
    ],
    results: [
      { metric: '成交率', value: '+35%', improvement: '系統化跟進使成交率提升 35%' },
      { metric: '文案產出', value: '10x', improvement: 'AI 生成讓文案產出速度提升 10 倍' },
      { metric: '行政時間', value: '-60%', improvement: '自動化減少 60% 行政工作時間' },
    ],
    testimonial: '990 系統讓我們可以把時間花在真正重要的事上——服務客戶。成交率提升，團隊也更有成就感！',
    color: 'from-blue-500/20 to-cyan-500/20',
  },
  {
    id: 'ecommerce',
    industry: '電商',
    clientName: '品味生活選物',
    icon: <ShoppingBag className="w-6 h-6" />,
    background: '經營日系生活雜貨的網路商店，每月訂單約 300-500 筆。隨著競爭者增多，獲客成本持續上升，且既有客戶回購率偏低。',
    problem: '• 廣告投放 ROI 持續下降，獲客成本攀升\n• 缺乏客戶分群管理，無法精準再行銷\n• 庫存管理與銷售預測不準確，造成斷貨或積壓',
    solution: [
      '導入 990 客戶數據平台，建立分群標籤系統',
      '智能再行銷自動化，針對不同族群推送個人化內容',
      'AI 銷售預測模型，優化庫存管理',
    ],
    results: [
      { metric: '獲客成本', value: '-40%', improvement: '精準投放使獲客成本降低 40%' },
      { metric: '客單價', value: '+25%', improvement: '個人化推薦提升客單價 25%' },
      { metric: '回購率', value: '+55%', improvement: '再行銷自動化帶動回購率提升 55%' },
    ],
    testimonial: '990 幫助我們從數據中看到真正的客戶需求，不再是盲目投放廣告。現在每一分行銷預算都花在刀口上！',
    color: 'from-purple-500/20 to-pink-500/20',
  },
];

function CaseStudyCard({ study, index }: { study: CaseStudy; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
    >
      <Card className="overflow-hidden border border-border/50 bg-card/50 backdrop-blur-sm">
        {/* Header */}
        <CardHeader className={cn(
          "relative overflow-hidden",
          "bg-gradient-to-br",
          study.color
        )}>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-background/80 backdrop-blur-sm">
                {study.icon}
              </div>
              <Badge variant="secondary" className="font-medium">
                {study.industry}
              </Badge>
            </div>
            <h3 className="text-xl font-bold text-foreground">{study.clientName}</h3>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Background */}
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              客戶背景
            </h4>
            <p className="text-sm text-foreground/80 leading-relaxed">{study.background}</p>
          </div>

          {/* Problem */}
          <div>
            <h4 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-2">
              面臨挑戰
            </h4>
            <div className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">
              {study.problem}
            </div>
          </div>

          {/* Solution */}
          <div>
            <h4 className="text-sm font-semibold text-green-400 uppercase tracking-wider mb-2">
              NEUXA 990 解決方案
            </h4>
            <ul className="space-y-2">
              {study.solution.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Results */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-primary uppercase tracking-wider mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              實際成效
            </h4>
            <div className="grid grid-cols-3 gap-4">
              {study.results.map((result, i) => (
                <div key={i} className="text-center">
                  <div className="text-2xl font-bold text-primary">{result.value}</div>
                  <div className="text-xs text-muted-foreground mt-1">{result.metric}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Testimonial */}
          <div className="relative bg-gradient-to-br from-primary/10 to-transparent rounded-lg p-4 border border-primary/20">
            <Quote className="absolute top-2 left-2 w-6 h-6 text-primary/40" />
            <p className="text-sm text-foreground/80 italic pl-6 leading-relaxed">
              "{study.testimonial}"
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function CaseStudies() {
  return (
    <PageContainer className="pb-8">
      <SectionHeader
        title="客戶成功案例"
        subtitle="看看這些企業如何透過 NEUXA 990 實現數位轉型"
      />

      {/* Stats Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
      >
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="p-3 rounded-lg bg-primary/10">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-bold">500+</div>
              <div className="text-sm text-muted-foreground">服務企業數</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="p-3 rounded-lg bg-green-500/10">
              <TrendingUp className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">平均 40%</div>
              <div className="text-sm text-muted-foreground">效率提升</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="p-3 rounded-lg bg-blue-500/10">
              <Clock className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">30 天內</div>
              <div className="text-sm text-muted-foreground">快速導入</div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Case Studies */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {caseStudies.map((study, index) => (
          <CaseStudyCard key={study.id} study={study} index={index} />
        ))}
      </div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-center"
      >
        <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20">
          <CardContent className="p-8">
            <h3 className="text-xl font-bold mb-2">準備好開始您的數位轉型之旅了嗎？</h3>
            <p className="text-muted-foreground mb-6">
  讓 NEUXA 990 成為您業務成長的最佳夥伴
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button size="lg" className="gap-2">
                預約免費諮詢
                <ArrowRight className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="lg">
                查看定價方案
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </PageContainer>
  );
}
