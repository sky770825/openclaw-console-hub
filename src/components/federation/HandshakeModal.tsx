import { useState } from 'react';
import { handshakeInit, handshakeRespond, type HandshakeInitPayload } from '@/services/federationApi';

interface Props {
  open: boolean;
  onClose: () => void;
}

type Step = 'init' | 'respond' | 'done';

export function HandshakeModal({ open, onClose }: Props) {
  const [step, setStep] = useState<Step>('init');
  const [nodeId, setNodeId] = useState('');
  const [nodeType, setNodeType] = useState<'local' | 'remote'>('remote');
  const [label, setLabel] = useState('');
  const [endpointUrl, setEndpointUrl] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [challenge, setChallenge] = useState('');
  const [signature, setSignature] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInit = async () => {
    if (!nodeId.trim() || !publicKey.trim()) {
      setError('node_id 和 public_key 為必填');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const payload: HandshakeInitPayload = {
        node_id: nodeId.trim(),
        node_type: nodeType,
        label: label.trim() || undefined,
        endpoint_url: endpointUrl.trim() || undefined,
        public_key: publicKey.trim(),
      };
      const result = await handshakeInit(payload);
      setChallenge(result.challenge);
      setStep('respond');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async () => {
    if (!signature.trim()) {
      setError('請輸入簽章');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await handshakeRespond(nodeId, signature.trim());
      setStep('done');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('init');
    setNodeId('');
    setNodeType('remote');
    setLabel('');
    setEndpointUrl('');
    setPublicKey('');
    setChallenge('');
    setSignature('');
    setError(null);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg mx-4 rounded-xl border border-white/10 bg-black/90 shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="font-semibold text-white">
            🤝 新節點加入聯盟
          </h2>
          <button onClick={handleClose} className="text-white/40 hover:text-white text-lg">✕</button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {/* 步驟指示 */}
          <div className="flex gap-2 text-xs">
            {(['init', 'respond', 'done'] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center gap-1">
                {i > 0 && <span className="text-white/20">→</span>}
                <span className={step === s ? 'text-cyan-400 font-medium' : step > s ? 'text-green-400' : 'text-white/30'}>
                  {i + 1}. {s === 'init' ? '節點資訊' : s === 'respond' ? '簽章驗證' : '完成'}
                </span>
              </div>
            ))}
          </div>

          {/* Step 1: init */}
          {step === 'init' && (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-white/50">Node ID *</label>
                  <input
                    value={nodeId}
                    onChange={(e) => setNodeId(e.target.value)}
                    placeholder="my-agent-001"
                    className="text-sm bg-white/5 border border-white/10 rounded px-3 py-2 text-white"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-white/50">節點類型</label>
                  <select
                    value={nodeType}
                    onChange={(e) => setNodeType(e.target.value as typeof nodeType)}
                    className="text-sm bg-white/5 border border-white/10 rounded px-3 py-2 text-white"
                  >
                    <option value="local">本地 (localhost)</option>
                    <option value="remote">遠端 (HTTPS)</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-white/50">節點名稱（選填）</label>
                <input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="My Claude Code Agent"
                  className="text-sm bg-white/5 border border-white/10 rounded px-3 py-2 text-white"
                />
              </div>

              {nodeType === 'remote' && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-white/50">端點 URL（選填）</label>
                  <input
                    value={endpointUrl}
                    onChange={(e) => setEndpointUrl(e.target.value)}
                    placeholder="https://my-agent.example.com"
                    className="text-sm bg-white/5 border border-white/10 rounded px-3 py-2 text-white"
                  />
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-xs text-white/50">Public Key（DER SPKI hex）*</label>
                <textarea
                  value={publicKey}
                  onChange={(e) => setPublicKey(e.target.value)}
                  placeholder="302a300506032b6570032100..."
                  rows={3}
                  className="text-xs font-mono bg-white/5 border border-white/10 rounded px-3 py-2 text-white/80 resize-none"
                />
                <p className="text-xs text-white/30">
                  將你的 Ed25519 public key 轉為 DER SPKI 格式並 hex 編碼
                </p>
              </div>

              <button
                onClick={handleInit}
                disabled={loading}
                className="w-full py-2 bg-cyan-600/80 hover:bg-cyan-600 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {loading ? '申請中...' : '申請加入聯盟'}
              </button>
            </div>
          )}

          {/* Step 2: respond */}
          {step === 'respond' && (
            <div className="flex flex-col gap-3">
              <div className="rounded-lg bg-white/5 border border-white/10 p-3">
                <div className="text-xs text-white/50 mb-1">Challenge（請用你的私鑰簽章）</div>
                <div className="font-mono text-xs text-cyan-300 break-all">{challenge}</div>
              </div>

              <div className="rounded-lg bg-black/40 p-3 text-xs text-white/50 space-y-1">
                <div className="font-medium text-white/70 mb-2">計算簽章方式</div>
                <code className="block text-green-300/70">
                  secret = public_key[0..31]  # 前 32 字元
                </code>
                <code className="block text-green-300/70">
                  signature = HMAC-SHA256(secret, challenge).hex()
                </code>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-white/50">簽章（hex）</label>
                <textarea
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  placeholder="a1b2c3d4..."
                  rows={3}
                  className="text-xs font-mono bg-white/5 border border-white/10 rounded px-3 py-2 text-white/80 resize-none"
                />
              </div>

              <button
                onClick={handleRespond}
                disabled={loading}
                className="w-full py-2 bg-green-600/80 hover:bg-green-600 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {loading ? '驗證中...' : '提交簽章'}
              </button>
            </div>
          )}

          {/* Step 3: done */}
          {step === 'done' && (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="text-4xl">✅</div>
              <div className="text-white font-medium">簽章驗證通過！</div>
              <div className="text-sm text-white/50">
                等待管理員審核（老蔡將收到 Telegram 通知），
                審核批准後您將收到聯盟 API Key。
              </div>
              <button
                onClick={handleClose}
                className="mt-2 px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors"
              >
                關閉
              </button>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
