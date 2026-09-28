// Which story engine the homepage journey uses by default.
//   'diorama' — 3D tabletop model (WebGL). Falls back to 'contour' if WebGL is unavailable.
//   'contour' — tilted contour map (Canvas 2D). Lighter; runs anywhere.
// Preview the other one with ?view=contour or ?view=diorama.
export const STORY_ENGINE: 'diorama' | 'contour' = 'diorama';

// Show the 3D / Map switch in the journey legend. Handy while reviewing; turn off for launch.
export const SHOW_VIEW_SWITCH = true;

// Show the Live / Day / Golden hour / Night light preview in the journey legend.
export const SHOW_LIGHT_PREVIEW = true;
