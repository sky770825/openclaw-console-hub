#!/usr/bin/env python3
"""
Git Commit Message Generator
根據 git diff 自動生成符合 Conventional Commits 規範的提交訊息
"""

import sys
import os
import re
import subprocess
import argparse
from typing import List, Tuple, Optional, Dict
from dataclasses import dataclass
from pathlib import Path

@dataclass
class FileChange:
    """檔案變更資訊"""
    path: str
    change_type: str  # added, modified, deleted, renamed
    additions: int = 0
    deletions: int = 0

@dataclass
class DiffSummary:
    """Diff 摘要"""
    files_changed: int
    insertions: int
    deletions: int
    file_changes: List[FileChange]
    has_new_files: bool
    has_deleted_files: bool
    has_renamed_files: bool

class CommitMessageGenerator:
    """提交訊息生成器"""
    
    # 檔案類型映射
    FILE_PATTERNS = {
        'docs': [
            r'\.md$', r'\.txt$', r'\.rst$', r'README', r'LICENSE', r'CHANGELOG',
            r'CONTRIBUTING', r'docs?/', r'documentation/'
        ],
        'config': [
            r'\.json$', r'\.ya?ml$', r'\.toml$', r'\.ini$', r'\.cfg$',
            r'\.conf$', r'config/', r'settings/'
        ],
        'test': [
            r'test', r'spec', r'__tests__', r'\.test\.', r'\.spec\.'
        ],
        'build': [
            r'package\.json$', r'Cargo\.toml$', r'pyproject\.toml$',
            r'setup\.py$', r'Makefile', r'Dockerfile', r'\.lock$',
            r'build\.gradle', r'pom\.xml'
        ],
        'ci': [
            r'\.github/', r'\.gitlab-ci', r'jenkins', r'travis', r'circleci'
        ],
        'style': [
            r'\.css$', r'\.scss$', r'\.less$', r'\.styl$'
        ],
        'script': [
            r'\.sh$', r'\.bash$', r'\.zsh$', r'\.fish$', r'scripts/'
        ]
    }
    
    def __init__(self, repo_path: str = "."):
        self.repo_path = Path(repo_path).resolve()
        self.raw_diff = ""
        self.diff_summary = None
    
    def _run_git(self, args: List[str]) -> Tuple[str, str, int]:
        """執行 git 命令"""
        try:
            result = subprocess.run(
                ['git'] + args,
                cwd=self.repo_path,
                capture_output=True,
                text=True,
                encoding='utf-8'
            )
            return result.stdout, result.stderr, result.returncode
        except Exception as e:
            return "", str(e), 1
    
    def get_staged_diff(self) -> str:
        """獲取已暫存的變更"""
        stdout, stderr, code = self._run_git(['diff', '--cached', '--stat'])
        if code != 0:
            print(f"錯誤: {stderr}", file=sys.stderr)
            return ""
        
        self.raw_diff, _, _ = self._run_git(['diff', '--cached'])
        return stdout
    
    def get_unstaged_diff(self) -> str:
        """獲取未暫存的變更"""
        stdout, stderr, code = self._run_git(['diff', '--stat'])
        if code != 0:
            print(f"錯誤: {stderr}", file=sys.stderr)
            return ""
        
        self.raw_diff, _, _ = self._run_git(['diff'])
        return stdout
    
    def parse_diff_stat(self, stat_output: str) -> DiffSummary:
        """解析 diff --stat 輸出"""
        file_changes = []
        has_new = has_deleted = has_renamed = False
        
        lines = stat_output.strip().split('\n')
        
        for line in lines:
            if not line or ('file' in line and 'changed' in line):
                continue
            
            # 解析檔案變更行: " path/to/file | 10 +++---"
            match = re.match(r'\s*([^|]+)\s*\|\s*(\d+)\s*([+-]*)', line)
            if match:
                path = match.group(1).strip()
                changes = match.group(3)
                
                # 判斷變更類型
                if '=>' in path or '{' in path:
                    change_type = 'renamed'
                    has_renamed = True
                elif changes and all(c == '-' for c in changes):
                    change_type = 'deleted'
                    has_deleted = True
                elif changes and all(c == '+' for c in changes):
                    change_type = 'added'
                    has_new = True
                else:
                    change_type = 'modified'
                
                additions = changes.count('+')
                deletions = changes.count('-')
                
                file_changes.append(FileChange(
                    path=path,
                    change_type=change_type,
                    additions=additions,
                    deletions=deletions
                ))
        
        # 解析總結行
        total_line = [l for l in lines if 'changed' in l]
        files_changed = insertions = deletions = 0
        
        if total_line:
            total_match = re.search(r'(\d+)\s+files?\s+changed', total_line[-1])
            insertions_match = re.search(r'(\d+)\s+insertions?', total_line[-1])
            deletions_match = re.search(r'(\d+)\s+deletions?', total_line[-1])
            
            files_changed = int(total_match.group(1)) if total_match else len(file_changes)
            insertions = int(insertions_match.group(1)) if insertions_match else 0
            deletions = int(deletions_match.group(1)) if deletions_match else 0
        
        self.diff_summary = DiffSummary(
            files_changed=files_changed,
            insertions=insertions,
            deletions=deletions,
            file_changes=file_changes,
            has_new_files=has_new,
            has_deleted_files=has_deleted,
            has_renamed_files=has_renamed
        )
        
        return self.diff_summary
    
    def _detect_scope(self, file_changes: List[FileChange]) -> Optional[str]:
        """從檔案路徑推測 scope"""
        if not file_changes:
            return None
        
        scopes = []
        for fc in file_changes:
            parts = fc.path.split('/')
            if len(parts) >= 2:
                scopes.append(parts[0])
            elif len(parts) == 1:
                filename = parts[0].lower()
                if 'config' in filename:
                    scopes.append('config')
                elif 'test' in filename:
                    scopes.append('test')
                elif 'build' in filename or 'make' in filename:
                    scopes.append('build')
        
        if scopes:
            from collections import Counter
            most_common = Counter(scopes).most_common(1)[0][0]
            return most_common if Counter(scopes)[most_common] > 1 else None
        
        return None
    
    def _detect_type(self, summary: DiffSummary) -> str:
        """從變更內容推測 type"""
        file_changes = summary.file_changes
        
        # 全是文檔
        all_docs = all(
            any(re.search(pattern, fc.path, re.I) for pattern in self.FILE_PATTERNS['docs'])
            for fc in file_changes
        )
        if all_docs:
            return 'docs'
        
        # 全是配置
        all_config = all(
            any(re.search(pattern, fc.path, re.I) for pattern in self.FILE_PATTERNS['config'])
            for fc in file_changes
        )
        if all_config:
            return 'chore'
        
        # 全是測試
        all_test = all(
            any(re.search(pattern, fc.path, re.I) for pattern in self.FILE_PATTERNS['test'])
            for fc in file_changes
        )
        if all_test:
            return 'test'
        
        # 全是 CI/CD
        all_ci = all(
            any(re.search(pattern, fc.path, re.I) for pattern in self.FILE_PATTERNS['ci'])
            for fc in file_changes
        )
        if all_ci:
            return 'ci'
        
        # 全是構建相關
        all_build = all(
            any(re.search(pattern, fc.path, re.I) for pattern in self.FILE_PATTERNS['build'])
            for fc in file_changes
        )
        if all_build:
            return 'build'
        
        # 有新增檔案且新增多於刪除
        if summary.has_new_files and summary.insertions > summary.deletions * 2:
            return 'feat'
        
        # 新增多於刪除
        if summary.insertions > summary.deletions:
            return 'feat'
        
        # 刪除多於新增
        if summary.deletions > summary.insertions:
            if summary.deletions > 100 and summary.insertions < 20:
                return 'refactor'
            return 'fix'
        
        return 'chore'
    
    def _generate_description(self, summary: DiffSummary, commit_type: str) -> str:
        """生成描述文字"""
        file_changes = summary.file_changes
        descriptions = []
        
        # 新增檔案
        new_files = [fc for fc in file_changes if fc.change_type == 'added']
        if new_files:
            if len(new_files) == 1:
                descriptions.append(f"add {os.path.basename(new_files[0].path)}")
            else:
                descriptions.append(f"add {len(new_files)} new files")
        
        # 刪除檔案
        deleted_files = [fc for fc in file_changes if fc.change_type == 'deleted']
        if deleted_files:
            if len(deleted_files) == 1:
                descriptions.append(f"remove {os.path.basename(deleted_files[0].path)}")
            else:
                descriptions.append(f"remove {len(deleted_files)} files")
        
        # 重命名
        if summary.has_renamed_files:
            descriptions.append("rename files")
        
        # 修改檔案
        modified = [fc for fc in file_changes if fc.change_type == 'modified']
        if modified and not descriptions:
            verbs = {
                'feat': 'add', 'fix': 'fix', 'docs': 'update documentation',
                'style': 'format', 'refactor': 'refactor', 'perf': 'optimize',
                'test': 'add tests for', 'chore': 'update',
                'ci': 'update CI', 'build': 'update build'
            }
            verb = verbs.get(commit_type, 'update')
            
            if len(modified) == 1:
                filename = os.path.basename(modified[0].path)
                name_without_ext = os.path.splitext(filename)[0]
                descriptions.append(f"{verb} {name_without_ext}")
            else:
                common_scope = self._detect_scope(modified)
                if common_scope:
                    descriptions.append(f"{verb} {common_scope}")
                else:
                    descriptions.append(f"{verb} code")
        
        if descriptions:
            if len(descriptions) == 1:
                return descriptions[0]
            elif len(descriptions) == 2:
                return f"{descriptions[0]} and {descriptions[1]}"
            else:
                return f"{descriptions[0]}, {descriptions[1]} and others"
        
        return "update files"
    
    def generate(self, staged: bool = True) -> Dict[str, str]:
        """生成提交訊息"""
        stat_output = self.get_staged_diff() if staged else self.get_unstaged_diff()
        
        if not stat_output.strip():
            return {
                'error': '沒有檢測到變更',
                'type': '', 'scope': '', 'description': '', 'full': ''
            }
        
        summary = self.parse_diff_stat(stat_output)
        commit_type = self._detect_type(summary)
        scope = self._detect_scope(summary.file_changes)
        description = self._generate_description(summary, commit_type)
        
        full_message = f"{commit_type}({scope}): {description}" if scope else f"{commit_type}: {description}"
        
        return {
            'type': commit_type,
            'scope': scope or '',
            'description': description,
            'full': full_message,
            'files_changed': str(summary.files_changed),
            'insertions': str(summary.insertions),
            'deletions': str(summary.deletions),
            'summary': f"{summary.files_changed} files changed, {summary.insertions} insertions(+), {summary.deletions} deletions(-)"
        }

def main():
    parser = argparse.ArgumentParser(
        description='Git Commit Message Generator - 根據 diff 生成 Conventional Commits 格式的提交訊息'
    )
    parser.add_argument('--unstaged', '-u', action='store_true',
                        help='使用未暫存的變更（預設使用已暫存的變更）')
    parser.add_argument('--json', '-j', action='store_true', help='以 JSON 格式輸出')
    parser.add_argument('--copy', '-c', action='store_true', help='複製到剪貼簿（macOS）')
    parser.add_argument('--apply', '-a', action='store_true', help='直接使用生成的訊息執行 git commit')
    parser.add_argument('--path', '-p', default='.', help='Git 倉庫路徑（預設: 當前目錄）')
    
    args = parser.parse_args()
    
    # 檢查是否在 git 倉庫中
    repo_path = Path(args.path).resolve()
    if not (repo_path / '.git').exists():
        print(f"錯誤: {repo_path} 不是 git 倉庫", file=sys.stderr)
        sys.exit(1)
    
    # 生成提交訊息
    generator = CommitMessageGenerator(repo_path)
    result = generator.generate(staged=not args.unstaged)
    
    if 'error' in result and result['error']:
        print(f"錯誤: {result['error']}", file=sys.stderr)
        sys.exit(1)
    
    # 輸出
    if args.json:
        import json
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        print("")
        print("=" * 60)
        print("📝 生成的提交訊息")
        print("=" * 60)
        print("")
        print(f"Type:        {result['type']}")
        print(f"Scope:       {result['scope'] or '(none)'}")
        print(f"Description: {result['description']}")
        print("")
        print("-" * 60)
        print(f"完整訊息:")
        print(f"  {result['full']}")
        print("-" * 60)
        print(f"")
        print(f"變更統計: {result['summary']}")
        print("")
    
    # 複製到剪貼簿
    if args.copy and not args.json:
        try:
            subprocess.run(['pbcopy'], input=result['full'], text=True, check=True)
            print("✅ 已複製到剪貼簿")
        except Exception as e:
            print(f"⚠️ 複製失敗: {e}", file=sys.stderr)
    
    # 直接提交
    if args.apply:
        try:
            subprocess.run(['git', '-C', str(repo_path), 'commit', '-m', result['full']], check=True)
            print(f"✅ 已提交: {result['full']}")
        except subprocess.CalledProcessError as e:
            print(f"❌ 提交失敗: {e}", file=sys.stderr)
            sys.exit(1)

if __name__ == '__main__':
    main()
