// src/lib/product-database.js
//
// 2026-10-08: the matcher lives once, in ../../../weyland-shared/product-database.js
// (imported the way ../../weyland-shared/security-headers.js is);
// weyland-cutsheetx-worker's src/lib/product-database.js is the same re-export.
// This file was the older of two copies (an exact query, a prefix query, then a
// category guess that put the first product of a category in a submittal); the
// packet (routes/subx-workspace.js) now gets the same answer the homepage
// paste gets, and never another maker's product for a named maker.
export * from "../../../weyland-shared/product-database.js";
