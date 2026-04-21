const DEFAULT_ENEMY_HP_MAX = 140
const DEBUG_ENEMY_HP_MAX = 1

function getBrowserQueryParams(): URLSearchParams {
  if (typeof window === 'undefined') {
    return new URLSearchParams()
  }
  const { search, hash } = window.location
  if (search.length > 1) {
    return new URLSearchParams(search.slice(1))
  }
  const q = hash.indexOf('?')
  if (q >= 0) {
    return new URLSearchParams(hash.slice(q + 1))
  }
  return new URLSearchParams()
}

function queryFlagTrue(params: URLSearchParams, keys: string[]): boolean {
  for (const key of keys) {
    const v = params.get(key)
    if (v === '1' || v === 'true' || v === 'yes') return true
  }
  return false
}

/**
 * ボス最大 HP。次のいずれかで 1 になる（デバッグ用）。
 * - 起動 URL のクエリ `?bossHp=1` / `?debugBoss=1`（`true` も可。ハッシュ内 `?` にも対応）
 * - ビルド時環境変数 `VITE_DEBUG_BOSS_HP=true`
 *
 * シーンの `create` / `reset` で呼ぶ（その時点の `location` を読む）。
 */
export function resolveEnemyHpMax(): number {
  if (import.meta.env.VITE_DEBUG_BOSS_HP === 'true') {
    return DEBUG_ENEMY_HP_MAX
  }
  const q = getBrowserQueryParams()
  if (queryFlagTrue(q, ['bossHp', 'BossHp', 'debugBoss', 'debugboss'])) {
    return DEBUG_ENEMY_HP_MAX
  }
  return DEFAULT_ENEMY_HP_MAX
}
