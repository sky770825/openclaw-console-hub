/**
 * CoreGatekeeper — 核心防線閘門
 *
 * 沒有通過認證 → 顯示感應閘門（輸入密語）
 * 通過認證 → 顯示 children
 *
 * 這是進入核心指揮中心的唯一入口。
 * 沒有感應就永遠無法進入這條防線。
 */

import { useState } from 'react';
import { Shield, Lock, KeyRound, Fingerprint, Eye, EyeOff, LogOut } from 'lucide-react';
import { useCoreAuth } from './CoreAuthProvider';
import { LEVEL_LABEL, DATA_EXPORT_POLICY } from '@/config/coreAuth';
import type { CoreAccessLevel } from '@/config/coreAuth';

function GatekeeperLogin() {
  const { login } = useCoreAuth();
  const [name, setName] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !passphrase.trim()) {
      setError('請填寫完整');
      return;
    }
    setLoading(true);
    setError('');

    // uid 使用 name 的 hash（簡化版）
    const uid = name.trim().toLowerCase().replace(/\s+/g, '-');
    const ok = await login(uid, name.trim(), passphrase.trim());
    setLoading(false);

    if (!ok) {
      setError('認證失敗：密語不正確或無此權限');
      setPassphrase('');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm mx-auto px-6">
        {/* 閘門圖示 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-500/10 mb-4">
            <Shield className="h-10 w-10 text-red-500" />
          </div>
          <h1 className="text-xl font-semibold">核心防線</h1>
          <p className="text-sm text-muted-foreground mt-1">
            需要數位認證才能進入指揮中心
          </p>
        </div>

        {/* 感應表單 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <Fingerprint className="h-3.5 w-3.5" />
              身份識別
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="輸入您的名稱"
              className="w-full px-3 py-2.5 rounded-lg border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500/50 transition-all"
              autoComplete="off"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <KeyRound className="h-3.5 w-3.5" />
              通行密語
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={passphrase}
                onChange={e => setPassphrase(e.target.value)}
                placeholder="輸入核心通行密語"
                className="w-full px-3 py-2.5 pr-10 rounded-lg border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500/50 transition-all"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs text-red-500 bg-red-500/10 px-3 py-2 rounded-lg">
              <Lock className="h-3.5 w-3.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Shield className="h-4 w-4" />
                通過防線
              </>
            )}
          </button>
        </form>

        <p className="text-center text-[10px] text-muted-foreground/50 mt-6">
          Openclaw Core Auth — 未授權存取將被記錄
        </p>
      </div>
    </div>
  );
}

/** 認證狀態欄（已登入時顯示在頂部） */
export function CoreAuthBar() {
  const { token, logout, level } = useCoreAuth();
  if (!token) return null;

  const exportPolicy = level ? DATA_EXPORT_POLICY[level] : null;

  return (
    <div className="flex items-center gap-3 px-4 py-1.5 bg-red-500/5 border-b border-red-500/10 text-xs">
      <div className="flex items-center gap-1.5">
        <Shield className="h-3 w-3 text-red-500" />
        <span className="text-red-600 font-medium">核心認證</span>
      </div>
      <span className="text-muted-foreground">
        {token.name} · {LEVEL_LABEL[token.level]}
      </span>
      {exportPolicy && (
        <span className="text-muted-foreground/50">
          資料外帶：{exportPolicy.label}
        </span>
      )}
      <div className="ml-auto flex items-center gap-2">
        <span className="text-muted-foreground/40">
          有效至 {new Date(token.exp).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
        </span>
        <button
          onClick={logout}
          className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-red-500/10 text-red-500/70 hover:text-red-500 transition-colors"
        >
          <LogOut className="h-3 w-3" />
          <span>登出</span>
        </button>
      </div>
    </div>
  );
}

/**
 * CoreGatekeeper — 包裹核心路由的閘門
 * 未認證 → 顯示登入
 * 認證中 → 載入動畫
 * 已認證 → 顯示 children
 */
export function CoreGatekeeper({
  children,
  requiredLevel = 'viewer',
}: {
  children: React.ReactNode;
  requiredLevel?: CoreAccessLevel;
}) {
  const { authenticated, loading, checkAccess } = useCoreAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">驗證核心認證中...</p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return <GatekeeperLogin />;
  }

  if (!checkAccess(requiredLevel)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <Lock className="h-10 w-10 text-red-500 mx-auto" />
          <p className="text-lg font-medium">權限不足</p>
          <p className="text-sm text-muted-foreground">
            此區域需要 {LEVEL_LABEL[requiredLevel]} 以上權限
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
