// Sync-only Tailwind config for claude.ai/design (see .design-sync/).
//
// The extension's own build purges every utility TabHub does not use, which is
// right for the extension and wrong for a design system: a design agent
// composing with these primitives needs the WHOLE token matrix — every
// bg/text/border × token, with hover/focus variants — or it writes classes that
// resolve to nothing. This config extends the app config with a safelist of
// exactly that matrix. It is consumed only by .design-sync/config.json's
// buildCmd and never by the extension build.
import base from './tailwind.config.js';

const tokens = [
  'background', 'foreground', 'card', 'card-foreground', 'popover', 'popover-foreground',
  'primary', 'primary-foreground', 'secondary', 'secondary-foreground',
  'muted', 'muted-foreground', 'accent', 'accent-foreground',
  'destructive', 'destructive-foreground', 'warning', 'warning-foreground',
  'faint', 'sidebar', 'scrim', 'border', 'input', 'ring'
];
const alphas = ['', '/10', '/15', '/40'];
const variants = ['', 'hover:', 'focus-visible:'];

const safelist = [];
for (const v of variants)
  for (const t of tokens)
    for (const a of alphas) {
      safelist.push(`${v}bg-${t}${a}`, `${v}text-${t}${a}`, `${v}border-${t}${a}`);
      if (!v) safelist.push(`ring-${t}${a}`, `divide-${t}${a}`, `placeholder:text-${t}${a}`);
    }
safelist.push(
  { pattern: /^rounded-(sm|md|lg|xl|full)$/ },
  { pattern: /^shadow-(panel|none|sm|md)$/ },
  { pattern: /^(font-sans|font-mono|text-(xs|sm|base|lg)|font-(normal|medium|semibold))$/ },
  { pattern: /^(p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|gap|gap-x|gap-y|space-x|space-y)-(0|px|0\.5|1|1\.5|2|2\.5|3|3\.5|4|5|6|8|10|12)$/ },
  { pattern: /^(h|w|size)-(4|5|6|7|8|9|10|12)$/ },
  { pattern: /^ring-(0|1|2)$/ }, { pattern: /^ring-offset-(0|1|2|background)$/ }
);

export default { ...base, safelist };
