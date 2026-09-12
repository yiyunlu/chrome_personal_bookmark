import React from 'react';
import { ExternalLink, FolderPen, Pencil, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from './ui/dropdown-menu';
import { t } from '../lib/i18n';

// Destructive items: shadcn's own convention, expressed with token classes only.
const DANGER_ITEM =
  'text-destructive focus:bg-destructive/10 focus:text-destructive [&_svg]:text-destructive';

/**
 * Right-click menu for bookmark cards and collection headers.
 *
 * Radix's `ContextMenu` primitive is not usable here: it derives its position
 * from a `Trigger` that must *wrap* the right-clicked element, and the two
 * trigger sites (`Sidebar`'s collection rows and `CollectionCard`'s cards) are
 * draggable hosts owned by SortableJS — wrapping or re-rendering them is what
 * desyncs React's virtual DOM during a drop. So this uses `DropdownMenu`
 * anchored to a zero-size virtual anchor placed at the stored pointer
 * coordinates, which keeps the pre-existing `contextMenu` state object and the
 * component's prop API byte-for-byte identical while handing Radix the whole
 * menu: roving focus (`ArrowUp`/`ArrowDown`/`Home`/`End`/typeahead), `Escape`,
 * focus trapping, outside-dismiss, collision-aware placement and ARIA.
 */
export function ContextMenu({
  contextMenu,
  onOpenNewTab,
  onEditCard,
  onDeleteCard,
  onRenameCollection,
  onDeleteCollection,
  onClose
}) {
  const open = !!contextMenu;

  return (
    <DropdownMenu
      open={open}
      // Not modal: a modal menu locks body scroll and sets `pointer-events:
      // none` on everything outside the portal, which would freeze the
      // SortableJS lists underneath.
      modal={false}
      onOpenChange={(next) => {
        if (!next) onClose?.();
      }}
    >
      <DropdownMenuTrigger asChild>
        {/* Virtual anchor: a 0x0, non-interactive box at the pointer. Radix
            measures it to place the menu, so the menu opens exactly where the
            user right-clicked. */}
        <span
          aria-hidden="true"
          data-context-menu-anchor=""
          className="pointer-events-none fixed block h-0 w-0"
          style={{ left: contextMenu?.x ?? 0, top: contextMenu?.y ?? 0 }}
        />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side="bottom"
        align="start"
        sideOffset={0}
        collisionPadding={8}
        className="min-w-[10rem]"
        aria-label={contextMenu?.kind === 'collection' ? t('collectionActions') : t('bookmarkActions')}
        // Keep focus where it was. Radix would otherwise restore focus to the
        // virtual anchor, which is invisible and carries no context.
        onCloseAutoFocus={(event) => event.preventDefault()}
        // A second right-click inside the menu should not surface the browser
        // menu on top of ours.
        onContextMenu={(event) => event.preventDefault()}
      >
        {contextMenu?.kind === 'card' && (
          <>
            <DropdownMenuItem onSelect={() => onOpenNewTab?.()}>
              <ExternalLink size={14} style={{ color: 'var(--muted)' }} />
              {t('openInNewTab')}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onEditCard?.()}>
              <Pencil size={14} style={{ color: 'var(--muted)' }} />
              {t('editBookmark')}
            </DropdownMenuItem>
            <DropdownMenuItem className={DANGER_ITEM} onSelect={() => onDeleteCard?.()}>
              <Trash2 size={14} />
              {t('deleteToTrash')}
            </DropdownMenuItem>
          </>
        )}

        {contextMenu?.kind === 'collection' && (
          <>
            <DropdownMenuItem onSelect={() => onRenameCollection?.()}>
              <FolderPen size={14} style={{ color: 'var(--muted)' }} />
              {t('renameFolder')}
            </DropdownMenuItem>
            <DropdownMenuItem className={DANGER_ITEM} onSelect={() => onDeleteCollection?.()}>
              <Trash2 size={14} />
              {t('deleteFolder')}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
