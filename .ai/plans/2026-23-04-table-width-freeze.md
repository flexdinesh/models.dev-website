# Freeze table widths + add drag resize

## Summary
Stop width jumps by sizing columns once from the full dataset, not from virtualized visible rows. Apply fixed widths through `<colgroup>`, then let users adjust widths manually with a drag handle. Do not persist custom widths.

## Key Changes
1. `src/App.tsx`
Pass full loaded rows into `Table` as a stable width-calculation source, separate from filtered and sorted visible rows.

2. `src/Table.tsx`
Add a one-time width calc from the full dataset after load.
Use formatted cell values and header labels to derive reasonable initial widths per column.
Cap widths with per-column min and max values so outliers do not explode layout.
Store widths in component state and never recalc them on search, sort, or scroll.
Render `<colgroup>` using those widths.
Add a resize handle to each header cell.
Use Pointer Events for drag resize so the same path covers mouse and touch unless touch UX proves too awkward.
Keep virtualization logic unchanged for rows.

3. `src/index.css`
Switch table to fixed layout.
Style the resize handle and resize cursor.
Prevent accidental text selection while dragging.
Keep horizontal scrolling for overflow.
If touch drag interferes with horizontal scroll, disable the resize handle on coarse pointers and keep frozen widths only.

## Tests / Verification
1. Run `npm run build`
2. Manual verify desktop:
Scroll through long-name rows and confirm widths stay fixed.
Sort and search and confirm widths still do not jump.
Drag several columns wider and narrower and confirm row and header alignment stays correct.
3. Manual verify mobile or touch:
Check whether pointer-based resize works without fighting horizontal scroll.
If it feels bad, disable handles for coarse pointers and keep frozen widths only.

## Decisions Made
1. Do not recalc widths after initial load.
2. Do not persist user-resized widths.
3. Prefer drag resize over relying only on truncation.
4. Touch support is acceptable only if it falls out of the same minimal pointer-events implementation.

## Tradeoffs / Risks
1. Fixed widths remove jank but can leave some content clipped until user resizes.
2. Widths based on the full dataset are stable but may be wider than strictly needed for current filters.
3. Touch drag may conflict with horizontal panning on small screens; fallback is disable resize handles there.

## Open Questions
None.

## Execution Guidance
If implementation deviates from this plan, update this file to reflect the approved change and surface the deviation to the user.
