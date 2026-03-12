/**
 * lib/xhs-client.ts
 *
 * XHS (小红书) data client for the 信息雷达 API.
 *
 * Uses the xiaohongshu-skills CLI (`python scripts/cli.py search-feeds`) to
 * fetch real search results via browser automation.  If the CLI is unavailable
 * or returns an error the function falls back gracefully to mock data so the
 * radar route never crashes.
 *
 * CLI output shape (from xhs/types.py Feed.to_dict):
 *   {
 *     "feeds": [
 *       {
 *         "id": "...",
 *         "xsecToken": "...",
 *         "modelType": "...",
 *         "index": 0,
 *         "displayTitle": "...",
 *         "type": "...",
 *         "user": { "userId": "...", "nickname": "..." },
 *         "interactInfo": {
 *           "likedCount": "123",
 *           "collectedCount": "45",
 *           "commentCount": "67",
 *           "sharedCount": "89"
 *         },
 *         "cover": "https://..."   // optional
 *       },
 *       ...
 *     ],
 *     "count": N
 *   }
 */

import { execFile } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import type { XHSNote } from '@/types'

const execFileAsync = promisify(execFile)

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Absolute path to the xiaohongshu-skills project. */
const XHS_SKILLS_DIR = path.join(
  process.env.HOME ?? '/root',
  '.claude/skills/xiaohongshu-skills-main'
)

/** CLI entry point relative to XHS_SKILLS_DIR. */
const CLI_SCRIPT = path.join(XHS_SKILLS_DIR, 'scripts/cli.py')

/** Max milliseconds to wait for the CLI before giving up. */
const CLI_TIMEOUT_MS = 30_000

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface XHSSearchOptions {
  limit: number
  sortBy?: 'latest' | 'popular'
  noteType?: 'normal' | 'video' | 'all'
}

export interface XHSSearchResult {
  notes: XHSNote[]
  total: number
  search_time_ms: number
}

// ---------------------------------------------------------------------------
// Internal CLI output types
// ---------------------------------------------------------------------------

interface CLIInteractInfo {
  likedCount?: string
  collectedCount?: string
  commentCount?: string
  sharedCount?: string
}

interface CLIUser {
  userId?: string
  nickname?: string
}

interface CLIFeed {
  id?: string
  xsecToken?: string
  displayTitle?: string
  user?: CLIUser
  interactInfo?: CLIInteractInfo
  cover?: string
}

interface CLIOutput {
  feeds: CLIFeed[]
  count: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Safely parse a count string like "1.2万" or "456" into a number. */
function parseCount(raw: string | undefined): number {
  if (!raw) return 0
  const s = raw.trim()
  if (s.endsWith('万')) {
    return Math.round(parseFloat(s) * 10_000)
  }
  const n = parseInt(s, 10)
  return isNaN(n) ? 0 : n
}

/** Map CLI sort option to xiaohongshu-skills --sort-by value. */
function mapSortBy(sortBy?: 'latest' | 'popular'): string {
  switch (sortBy) {
    case 'latest':
      return '最新'
    case 'popular':
      return '最多点赞'
    default:
      return '综合'
  }
}

/** Map noteType to xiaohongshu-skills --note-type value. */
function mapNoteType(noteType?: 'normal' | 'video' | 'all'): string {
  switch (noteType) {
    case 'normal':
      return '图文'
    case 'video':
      return '视频'
    default:
      return '不限'
  }
}

/** Convert a single CLI feed record to our XHSNote shape. */
function mapFeedToNote(feed: CLIFeed, query: string): XHSNote {
  const id = feed.id ?? crypto.randomUUID()
  const xsecToken = feed.xsecToken ?? ''
  const noteUrl =
    id && xsecToken
      ? `https://www.xiaohongshu.com/explore/${id}?xsec_token=${xsecToken}`
      : `https://www.xiaohongshu.com/explore/${id}`

  return {
    id,
    title: feed.displayTitle ?? `关于「${query}」的笔记`,
    author: feed.user?.nickname ?? '未知用户',
    author_id: feed.user?.userId ?? '',
    content_preview: feed.displayTitle ?? '',
    likes: parseCount(feed.interactInfo?.likedCount),
    comments: parseCount(feed.interactInfo?.commentCount),
    shares: parseCount(feed.interactInfo?.sharedCount),
    tags: [query],
    cover_image_url: feed.cover ?? null,
    note_url: noteUrl,
    published_at: new Date().toISOString(), // CLI search-feeds does not return publish date
    collected_at: new Date().toISOString(),
  }
}

/** Generate fallback mock notes when the real fetch fails. */
function generateFallbackNotes(query: string, limit: number): XHSNote[] {
  const now = new Date().toISOString()
  const base = [
    { author: '小红书达人一号', authorId: 'xhs_author_001', likes: 12300, comments: 456, shares: 789 },
    { author: '时尚博主小美',   authorId: 'xhs_author_002', likes: 8900,  comments: 234, shares: 312 },
    { author: '生活方式KOL',   authorId: 'xhs_author_003', likes: 23400, comments: 1023, shares: 567 },
    { author: '种草专家大v',   authorId: 'xhs_author_004', likes: 5600,  comments: 189, shares: 234 },
    { author: '内容创作小白',  authorId: 'xhs_author_005', likes: 3400,  comments: 98,  shares: 156 },
  ]

  return base.slice(0, Math.min(limit, base.length)).map((b, i) => ({
    id: `mock_note_${i + 1}_${Date.now()}`,
    title: `关于「${query}」的热门笔记 #${i + 1}`,
    author: b.author,
    author_id: b.authorId,
    content_preview: `这是一篇关于${query}的高质量笔记，分享了实用技巧和个人经验，获得了大量用户点赞收藏...（降级mock数据）`,
    likes: b.likes,
    comments: b.comments,
    shares: b.shares,
    tags: [query, '小红书', '种草', '生活方式', '推荐'],
    cover_image_url: null,
    note_url: `https://www.xiaohongshu.com/explore/mock00${i + 1}`,
    published_at: new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000).toISOString(),
    collected_at: now,
  }))
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch XHS notes for a given search query.
 *
 * Calls the xiaohongshu-skills CLI under the hood.  On any failure (CLI not
 * found, Chrome not running, login required, timeout) it returns a graceful
 * degradation result with mock notes so the caller never needs to catch.
 *
 * @param query    Search keyword
 * @param options  Pagination and filter options
 */
export async function fetchXHSNotes(
  query: string,
  options: XHSSearchOptions
): Promise<XHSSearchResult> {
  const { limit, sortBy, noteType } = options
  const startMs = Date.now()

  // Build CLI args
  const args: string[] = [
    CLI_SCRIPT,
    'search-feeds',
    '--keyword', query,
    '--sort-by', mapSortBy(sortBy),
    '--note-type', mapNoteType(noteType),
  ]

  let stdout = ''
  try {
    const result = await execFileAsync('python3', args, {
      cwd: XHS_SKILLS_DIR,
      timeout: CLI_TIMEOUT_MS,
      env: { ...process.env },
    })
    stdout = result.stdout
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[XHSClient] CLI execution failed:', message)
    // Graceful degradation — return mock notes
    return {
      notes: generateFallbackNotes(query, limit),
      total: 0,
      search_time_ms: Date.now() - startMs,
    }
  }

  // Parse CLI JSON output
  let parsed: CLIOutput
  try {
    parsed = JSON.parse(stdout) as CLIOutput
  } catch (err) {
    console.error('[XHSClient] Failed to parse CLI output:', stdout.slice(0, 200))
    return {
      notes: generateFallbackNotes(query, limit),
      total: 0,
      search_time_ms: Date.now() - startMs,
    }
  }

  if (!Array.isArray(parsed.feeds) || parsed.feeds.length === 0) {
    console.warn('[XHSClient] CLI returned empty feeds for query:', query)
    return {
      notes: generateFallbackNotes(query, limit),
      total: 0,
      search_time_ms: Date.now() - startMs,
    }
  }

  // Map CLI records to XHSNote, respecting the requested limit
  const notes: XHSNote[] = parsed.feeds
    .slice(0, limit)
    .map((feed) => mapFeedToNote(feed, query))

  return {
    notes,
    total: parsed.count ?? notes.length,
    search_time_ms: Date.now() - startMs,
  }
}
