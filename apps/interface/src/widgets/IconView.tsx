// Moved to @streamdesk/ui-kit so both built-in widgets and plugin widgets
// (e.g. windows-control's sliders) can render icons the same way without a
// plugin having to reach into the Interface app's internals. This file is
// kept as a thin re-export (rather than deleted) purely so any stray
// import of the old path doesn't hard-break; new code should import
// IconView from "@streamdesk/ui-kit" directly.
export { IconView } from "@streamdesk/ui-kit";
