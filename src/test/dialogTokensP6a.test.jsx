import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { AICategorizeModal } from '../components/AICategorizeModal';
import { EditBookmarkModal } from '../components/EditBookmarkModal';
import { SaveTabsModal } from '../components/SaveTabsModal';
import { SettingsModal } from '../components/SettingsModal';
import { cn } from '../lib/cn';
import { t } from '../lib/i18n';
import { tick } from './dialogHelpers';

/* P6a — the four dialog surfaces that moved off inline `var()` styling and onto
   token classes.

   Two kinds of assertion here, and both can fail:

   1. **No inline `var()` below the panel.** The panel element itself still gets
      its surface from `DialogShell` (another phase owns that file), so the sweep
      starts at the panel's descendants. Put one `style={{ color: 'var(--text)' }}`
      back anywhere in these four files and the matching case fails.

   2. **The merged class string, not the source literal.** `cn()` is
      tailwind-merge, so an override can be present in the source and absent from
      the DOM. These read `element.className` *after* the merge and check both
      what survived and what was displaced — which is the only way to see the four
      mechanisms in SHADCN_MIGRATION.md. The `md:text-sm` case is the important
      one: `Input` ships `text-base md:text-sm`, and an unprefixed `text-sm`
      deletes only `text-base`, leaving the prefixed class to win from 768px up. */

const editorState = {
  id: 'b1',
  title: 'Example',
  url: 'https://example.com',
  folderQuery: '',
  targetParentId: 'c1',
  saving: false
};

const targets = [
  { id: 'c1', title: 'Work' },
  { id: 'c2', title: 'Reading' }
];

const tabs = [{ id: 1, title: 'Tab one', url: 'https://example.com/one' }];

const aiState = {
  loading: false,
  error: null,
  newCollections: ['Design'],
  suggestions: [
    { bookmarkId: 'b1', bookmarkTitle: 'My Repo', targetCollectionTitle: 'Dev', reason: 'github.com', status: 'pending' },
    { bookmarkId: 'b2', bookmarkTitle: 'Docs', targetCollectionTitle: 'Dev', reason: '', status: 'accepted' },
    { bookmarkId: 'b3', bookmarkTitle: 'Old', targetCollectionTitle: 'Dev', reason: '', status: 'rejected' }
  ]
};

function renderEditor(props = {}) {
  return render(
    <EditBookmarkModal
      editorState={editorState}
      setEditorState={vi.fn()}
      filteredTargets={targets}
      onSave={vi.fn()}
      onClose={vi.fn()}
      {...props}
    />
  );
}

function renderSaveTabs(props = {}) {
  return render(
    <SaveTabsModal
      open
      tabs={tabs}
      defaultFolderName="Folder"
      collections={[{ id: 'c1', title: 'Work' }]}
      onSave={vi.fn().mockResolvedValue(undefined)}
      onClose={vi.fn()}
      {...props}
    />
  );
}

function renderAI(props = {}) {
  return render(
    <AICategorizeModal
      aiState={aiState}
      onAcceptSuggestion={vi.fn()}
      onRejectSuggestion={vi.fn()}
      onApplyAll={vi.fn()}
      onClose={vi.fn()}
      {...props}
    />
  );
}

function renderSettings(props = {}) {
  return render(<SettingsModal open onClose={vi.fn()} onExport={vi.fn()} onImport={vi.fn()} {...props} />);
}

function panel() {
  return document.querySelector('[role="dialog"]');
}

describe('P6a — no inline var() colours below the dialog panel', () => {
  beforeEach(() => {
    chrome.storage.local.get = vi.fn((_keys, cb) => cb({}));
  });

  it.each([
    ['EditBookmarkModal', renderEditor],
    ['SaveTabsModal', renderSaveTabs],
    ['AICategorizeModal', renderAI],
    ['SettingsModal', renderSettings]
  ])('%s styles every colour with a token class', async (_name, mount) => {
    mount();
    await tick();
    const content = panel();

    const styled = Array.from(content.querySelectorAll('[style]')).map((el) => el.getAttribute('style'));
    expect(styled.filter((s) => s.includes('var(--'))).toEqual([]);

    // And positively: the header rule and the visible title take their colour
    // from token classes, which is what replaced the two inline `var()`s that
    // every one of these four headers used to carry. (`panel()` finds Radix's
    // Content; its first child is DialogShell's sr-only DialogTitle, so the
    // visible header is selected by its own divider class.)
    const header = content.querySelector('.border-b');
    expect(header.className).toContain('border-border');
    expect(header.querySelector('h2').className).toContain('text-foreground');
    expect(header.querySelector('h2').className).toContain('text-base');
  });
});

describe('P6a — what survived the merge on the dialog fields', () => {
  it('the Input override is total: no bare text-base, no live md:text-sm from the primitive', () => {
    renderEditor();
    const field = screen.getByLabelText(t('titleLabel'));

    // `Input` ships `text-base md:text-sm`. The unprefixed override removes
    // `text-base` only; the prefixed class is its own merge group and survives.
    // The invariant that matters is therefore not "md:text-sm is present" — it
    // always is, vendored — but "every surviving text size resolves to the same
    // value", i.e. the field cannot render one size below 768px and another
    // above. Drop the `md:` half of an override that changes the size and this
    // is the assertion that fails.
    expect(field.className).not.toContain('text-base');
    const sizes = field.className
      .split(/\s+/)
      .filter((c) => /(^|:)text-(xs|sm|base|lg)$/.test(c))
      .map((c) => c.split(':').pop());
    expect(sizes.length).toBeGreaterThan(1);
    expect([...new Set(sizes)]).toEqual(['text-sm']);

    // Flat field: `shadow` is a custom scale registered in src/lib/cn.js, which
    // is what makes `shadow-none` able to displace the vendored `shadow-sm`.
    expect(field.className).toContain('shadow-none');
    expect(field.className).not.toMatch(/(^|\s)shadow-sm(\s|$)/);

    // Controls are rounded-md per the radius table; P3's rounded-lg is gone.
    expect(field.className).toContain('rounded-md');
    expect(field.className).not.toContain('rounded-lg');

    // A 2px ring that keeps the vendored colour (--ui-ring IS the accent).
    expect(field.className).toContain('focus-visible:ring-2');
    expect(field.className).not.toContain('focus-visible:ring-1');
    expect(field.className).toContain('focus-visible:ring-ring');
  });

  it('cn() proves the same two mechanisms on the real literals', () => {
    // Mechanism D, with the exact base string from src/components/ui/input.jsx.
    expect(cn('text-base md:text-sm', 'text-sm')).toContain('md:text-sm');
    expect(cn('text-base md:text-sm', 'text-sm md:text-sm')).toBe('text-sm md:text-sm');
    // Mechanism C, with the exact ring/shadow pair from the same file.
    expect(cn('shadow-sm focus-visible:ring-1 focus-visible:ring-ring', 'shadow-none focus-visible:ring-2')).toBe(
      'focus-visible:ring-ring shadow-none focus-visible:ring-2'
    );
  });

  it('the SelectTrigger keeps its :focus ring colour and gets the 2px width', () => {
    renderSaveTabs();
    const trigger = screen.getByLabelText(t('targetCollection'));

    expect(trigger.className).toContain('focus:ring-2');
    expect(trigger.className).not.toContain('focus:ring-1');
    expect(trigger.className).toContain('focus:ring-ring');
    expect(trigger.className).toContain('shadow-none');
    // No responsive-prefixed class on SelectTrigger, so none to restate.
    expect(trigger.className).not.toContain('md:');
  });

  it('every field Label keeps a line height after text-xs deleted the cva one', () => {
    // Mechanism A: `Label`'s base is `text-sm font-medium leading-none`, and a
    // later `text-xs` removes `leading-none` unless it is restated.
    renderEditor();
    const label = document.querySelector('label[for="tabhub-edit-title"]');

    expect(label.className).toContain('text-xs');
    expect(label.className).toContain('leading-none');
    expect(label.className).not.toContain('leading-normal');
    expect(cn('text-sm font-medium leading-none', 'text-xs')).not.toContain('leading');
  });
});

describe('P6a — the four close buttons have an accessible name', () => {
  beforeEach(() => {
    chrome.storage.local.get = vi.fn((_keys, cb) => cb({}));
  });

  it.each([
    ['EditBookmarkModal', renderEditor],
    ['SaveTabsModal', renderSaveTabs],
    ['AICategorizeModal', renderAI],
    ['SettingsModal', renderSettings]
  ])('%s: the header X closes the dialog and is reachable by name', async (_name, mount) => {
    const onClose = vi.fn();
    mount({ onClose });
    await tick();

    fireEvent.click(screen.getByRole('button', { name: t('close') }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('P6a — SettingsModal Data section', () => {
  beforeEach(() => {
    chrome.storage.local.get = vi.fn((_keys, cb) => cb({}));
  });

  // Carry-in from the P5 reviews: the sidebar's theme group got a named
  // role="group" and this heading did not, so the two surfaces diverged.
  it('names a role="group" with the visible heading, P5b-style', async () => {
    renderSettings();
    await tick();

    const group = screen.getByRole('group');
    const labelId = group.getAttribute('aria-labelledby');
    expect(labelId).toBeTruthy();
    expect(document.getElementById(labelId)?.textContent?.trim()).toBe(t('dataSection'));
    // The two buttons the heading names are inside the group it labels.
    expect(group).toContainElement(screen.getByRole('button', { name: t('exportData') }));
    expect(group).toContainElement(screen.getByRole('button', { name: t('importData') }));
  });

  it('export and import still fire, and import still opens the file picker', async () => {
    const onExport = vi.fn();
    renderSettings({ onExport });
    await tick();

    fireEvent.click(screen.getByRole('button', { name: t('exportData') }));
    expect(onExport).toHaveBeenCalledTimes(1);

    const picker = screen.getByLabelText(t('importData'));
    const click = vi.spyOn(picker, 'click');
    fireEvent.click(screen.getByRole('button', { name: t('importData') }));
    expect(click).toHaveBeenCalledTimes(1);
  });
});

describe('P6a — AICategorizeModal rows', () => {
  it('marks a rejected row without recolouring its border, and keeps the accept/reject routing', () => {
    const onAccept = vi.fn();
    const onReject = vi.fn();
    renderAI({ onAcceptSuggestion: onAccept, onRejectSuggestion: onReject });

    // Row 0 is pending, row 2 is rejected.
    const rows = Array.from(panel().querySelectorAll('.rounded-md.border'));
    const rejected = rows.find((row) => row.className.includes('opacity-40'));
    expect(rejected).toBeTruthy();
    expect(rejected.textContent).toContain('Old');
    expect(rejected.className).toContain('border-border');

    fireEvent.click(screen.getByRole('button', { name: t('aiAccept') }));
    expect(onAccept).toHaveBeenCalledWith(0);
    fireEvent.click(screen.getByRole('button', { name: t('aiReject') }));
    expect(onReject).toHaveBeenCalledWith(0);
  });
});
