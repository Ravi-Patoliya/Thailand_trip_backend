'use strict';

// Escapes regex metacharacters so user-supplied search terms can be safely
// interpolated into a RegExp without changing match semantics or enabling
// pathological patterns (ReDoS).
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

module.exports = escapeRegex;
