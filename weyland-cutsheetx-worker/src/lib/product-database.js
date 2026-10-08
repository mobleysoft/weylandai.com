// src/lib/product-database.js
//
// 2026-10-08: the matcher lives once, in ../../../weyland-shared/product-database.js
// (imported the way ../../weyland-shared/security-headers.js is), and
// weyland-subx-worker's src/lib/product-database.js is the same re-export, so a
// fix lands once for the homepage paste, the CutsheetX MATCH form, the Finder
// and the submittal packet. Until this file was a 594-line copy of its own and
// SubX carried an older copy: "Ives 8200" came back as a Sargent lock, "high,
// exact", from the exactAnyMfg fallback here, and the packet's copy still had
// a category guess. See the shared module for what a line gets.
export * from "../../../weyland-shared/product-database.js";
