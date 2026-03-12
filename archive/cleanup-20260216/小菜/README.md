# 研究搜集框架

## 研究目标
1. Moltbook - 技术/产品/市场信息
2. Clawhub - 技术/产品/市场信息
3. 相关竞品与市场趋势

## 搜集维度

### 1. 技术（稳定度/成本/速度）
- 架构模块清单
- 关键流程（任务建立→排程→执行→重试→完成）
- 依赖第三方（模型、DB、queue、监控）
- 任务成功率、每任务成本、平均/长尾延迟
- 保护机制：重试策略、timeout、幂等、限流、降级、快取、fallback model、权限/配额

### 2. 产品（用户目标导向）
- 3个核心用户场景：谁、为什么用、成功定义、目前卡点
- Onboarding：从进站到「第一次成功跑完任务」的步骤与流失点

### 3. 网站（漏斗/CTA）
- 漏斗数字：PV→注册→启用→付费
- CTA：有哪些、出现在哪里、点击/转换
- 核心价值主张与证据

### 4. 内容（产能/SEO/广告）
- 目标关键字 20-50 个
- 竞品内容策略
- 内容工作流

### 5. 定价
- 竞品定价页分析
- 计费单位选择

## 证据格式
每主题固定存 3 类证据：
1. 一句话结论
2. 引用来源链接
3. 可套用到 OpenClaw 的点（1-3 条）

## 资料夹结构
```
小菜/
├── research-moltbook/
│   ├── technical/evidence/
│   ├── product/evidence/
│   ├── website/evidence/
│   ├── content/evidence/
│   └── pricing/evidence/
├── research-clawhub/
│   └── [同上结构]
└── research-market/
    └── [竞品与市场]
```

## 搜索关键词

### Moltbook
- "moltbook" workflow automation
- "moltbook" AI agent
- "moltbook" pricing review

### Clawhub
- "clawhub" skill marketplace
- "clawhub" OpenClaw
- "clawhub" agent skills

### 技术与市场
- agent orchestration reliability best practices
- LLM cost optimization strategies
- SaaS developer tools pricing models
- workflow automation competitive analysis
