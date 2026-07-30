/**
 * @typedef {Object} Card
 * @property {string} id
 * @property {string} title
 * @property {string} url
 * @property {string} parentId
 * @property {number} index
 */

/**
 * @typedef {Object} Collection
 * @property {string} id
 * @property {string} title
 * @property {string} parentId
 * @property {Card[]} cards
 * @property {boolean} editable
 * @property {boolean} deletable
 */

/**
 * @typedef {Object} Source
 * @property {string} id
 * @property {string} title
 * @property {boolean} isTabHub
 */

/**
 * @typedef {Object} AISuggestion
 * @property {string} bookmarkId
 * @property {string} targetCollectionTitle
 * @property {string} reason
 */

/**
 * @typedef {Object} ChatMessage
 * @property {'user'|'assistant'} role
 * @property {string} text
 * @property {Card[]} [results]
 * @property {Function} [onConfirm]
 * @property {string} [confirmLabel]
 */
