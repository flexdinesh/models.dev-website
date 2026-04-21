# Plan: Multi-term AND Search

## Problem
Current search uses comma-splitting with OR logic. Typing "openrouter opus" fails because:
1. It's treated as a single contiguous term (not split by space)
2. OR logic matches if ANY term matches (you want ALL terms to match)

## Solution
Modify `parseSearchTerms()` to split by whitespace AND commas, then use AND logic (`every` instead of `some`).

## Changes Required

**File: `src/App.tsx`**

1. **Lines 29-34**: Update `parseSearchTerms()` to split by both comma and whitespace
2. **Lines 206-209**: Change filter from `terms.some()` to `terms.every()`

## Before/After Examples

| Search Input | Current Behavior | New Behavior |
|--------------|-----------------|--------------|
| `openrouter opus` | Single term "openrouter opus", fails | `["openrouter", "opus"]`, requires BOTH |
| `openrouter, claude` | `["openrouter", "claude"]`, OR logic (matches either) | `["openrouter", "claude"]`, AND logic (matches both) |
| `openrouter,anthropic opus,pro` | `["openrouter", "anthropic", "opus", "pro"]`, OR logic | `["openrouter", "anthropic", "opus", "pro"]`, AND logic |

## Tradeoffs
- **Loss**: No more OR logic (e.g., "anthropic or openrouter" won't work)
- **Gain**: Intuitive multi-term filtering as users expect

## Verification
1. Type "openrouter opus" → should show only OpenRouter models with "opus" in name
2. Type "anthropic claude" → should show only Anthropic's Claude models
3. Empty search → shows all rows (unchanged)
