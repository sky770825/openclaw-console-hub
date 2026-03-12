# Clawhub 研究

## 状态说明

由于 "Clawhub" 是一个相对新的概念（与 OpenClaw 生态系统相关），公开的第三方评价和详细资料较为有限。基于现有信息整理如下：

## 已知信息

### 定位
- **Clawhub** 是 OpenClaw 生态系统的技能市场 (Skill Marketplace)
- 用于搜索、安装、更新和发布 Agent Skills
- 网站: https://clawhub.com

### 功能特性（基于本地 Skill 文件）
根据 `/Users/caijunchang/.openclaw/workspace/skills/clawhub/SKILL.md`:

1. **搜索技能**: 在 clawhub.com 查找可用的 Agent Skills
2. **安装技能**: 一键安装技能到本地 workspace
3. **更新技能**: 同步已安装技能到最新版本
4. **发布技能**: 将新技能发布到市场

### 技能格式
Clawhub 使用标准化的 Skill 格式：
```
skill-name/
├── SKILL.md (必需)
│   ├── YAML frontmatter (name, description)
│   └── Markdown 说明
├── scripts/ (可选)
├── references/ (可选)
└── assets/ (可选)
```

## 需要进一步搜集的信息

### 竞品对比
| 平台 | 类型 | 特点 |
|------|------|------|
| Clawhub | AI Agent Skills | 与 OpenClaw 深度集成 |
| npm | Node.js 包 | 最大的 JS 包管理器 |
| PyPI | Python 包 | Python 官方包索引 |
| Docker Hub | 容器镜像 | 容器化应用分发 |
| GitHub Marketplace | Actions/Apps | GitHub 生态集成 |

### 关键问题待研究
1. Clawhub 是否有付费技能/抽成机制？
2. 技能审核流程如何？
3. 下载量/流行度统计？
4. 用户评价系统？
5. 与竞品的差异化优势？

## 可套用到 OpenClaw 的点

1. **Skill 标准化**: Clawhub 的 SKILL.md 格式设计良好，可作为行业参考
2. **渐进式披露**: Skill 的 metadata → SKILL.md → references 三级加载机制节省 token
3. **本地优先**: 技能安装到本地 workspace，符合开发者习惯

## 建议的后续搜索

需要直接浏览 clawhub.com 获取：
- 热门技能排行
- 技能分类/标签
- 用户评价
- 定价信息（如有）
- 发布者指南

---
*搜集时间: 2026-02-14*
*注: 需要直接访问 clawhub.com 获取更详细信息*
