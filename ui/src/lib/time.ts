/** Format seconds as `M:SS` — the read-time and seek-bar displays.
 *
 * Lives here rather than beside the components that use it because a module
 * that exports both components and plain functions loses React Fast Refresh
 * (and eslint's `react-refresh/only-export-components` says so).
 */
export function fmtTime(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}
