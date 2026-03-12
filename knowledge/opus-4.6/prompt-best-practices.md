# Opus 4.6 API Prompt 最佳實踐

**官方指南** (platform.claude.com/docs)

1. **Effort 參數**：
   - high (預設)：複雜任務
   - medium/low：簡單查詢（減 Token）

2. **工具觸發**：
   - ✅ "Use [tool] when it enhances understanding"
   - ❌ "If in doubt, use [tool]" (過度觸發)

3. **避免 Over-prompting**：
   - Opus 4.6 工具觸發更準確，移除冗餘指令

4. **長任務**：
   - 用 Compaction + Agent Teams

**來源**：Claude Prompting Best Practices
