#!/usr/bin/env python3
"""
The build pipeline: regenerates the page-serving section of weyland.worker.js
from src/pages/*.html + src/routes_manifest.json.

This replaces hand-editing the monolithic worker.js with a data-driven build:
adding a new page/product = add its real content file + one manifest entry,
then re-run this script. Everything outside the page-serving section (all
the real backend business logic - PDF generation, cut-sheet matching, auth,
etc.) is left completely untouched.

Usage: python3 build.py
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).parent
WORKER_FILE = ROOT / "weyland.worker.js"
PAGES_DIR = ROOT / "src" / "pages"
MANIFEST_FILE = ROOT / "src" / "routes_manifest.json"

# Nav labels for routes that should appear in every page's navigation.
# Single source of truth - add a route here and it appears on every page
# automatically, no per-page edits required.
ROUTE_LABELS = {
    "onboarding": "ONBOARDING",
    "huntx": "HUNTX",
    "takeoffx": "TAKEOFFX",
    "subx": "SUBX",
    "propx": "PROPX",
    "sightx": "SIGHTX",
    "meetingx": "MEETX",
    "qtext": "QTEXT",
    "whyweyland": "WHY WEYLAND",
    "venturedeck": "VENTURE DECK",
    "careers": "CAREERS",
}
SELF_ALIASES = {"meetingx": ["meetingx", "meetx"]}


def js_escape(s):
    return s.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")


def fn_name_for_route(route):
    """Sanitize a route key (which may contain slashes/dots for nested
    static assets) into a valid JS function name."""
    return "serve_" + re.sub(r"[^a-zA-Z0-9_]", "_", route)


def build_render_nav():
    labels_js = ",\n".join(f'    {k}: "{v}"' for k, v in ROUTE_LABELS.items())
    self_aliases_js = ", ".join(f'{k}: {json.dumps(v)}' for k, v in SELF_ALIASES.items())
    return (
        "  var ROUTE_LABELS = {\n"
        f"{labels_js}\n"
        "  };\n"
        "  function renderNav(current) {\n"
        f"    var selfAliases = {{ {self_aliases_js} }};\n"
        "    var exclude = selfAliases[current] || [current];\n"
        "    var links = \"\";\n"
        "    for (var key in ROUTE_LABELS) {\n"
        "      if (exclude.indexOf(key) !== -1) continue;\n"
        "      links += \"<a href=\\\"/\" + key + \"/\\\">\" + ROUTE_LABELS[key] + \"</a>\";\n"
        "    }\n"
        "    return links;\n"
        "  }\n"
    )


def build_serve_function(route, entry):
    fn_name = fn_name_for_route(route)
    file_path = PAGES_DIR / entry["file"] if "file" in entry else Path(entry.get("source", ""))
    content_type = "application/json; charset=UTF-8" if entry["type"] == "static_json" else "text/html; charset=UTF-8"

    if entry["type"] == "templated_with_nav":
        html = file_path.read_text()
        if "{{NAV}}" not in html:
            raise ValueError(f"{route}: templated_with_nav page missing {{{{NAV}}}} placeholder")
        before, after = html.split("{{NAV}}", 1)
        body = f'"{js_escape(before)}" + renderNav("{route}") + "{js_escape(after)}"'
    else:
        html = file_path.read_text()
        body = f'"{js_escape(html)}"'

    return (
        f"  function {fn_name}() {{\n"
        f"    return new Response({body}, "
        f'{{ headers: {{ "Content-Type": "{content_type}", "Cache-Control": "public, max-age=60" }} }});\n'
        "  }\n"
    )


def build():
    manifest = json.loads(MANIFEST_FILE.read_text())
    content = WORKER_FILE.read_text()

    first_serve = min(m.start() for m in re.finditer(r"  function serve_", content))
    map_start = content.index("  var map = {")
    map_end = content.index("};", map_start) + 2

    print(f"Building {len(manifest)} routes...")

    generated = build_render_nav()
    map_entries = []
    for route, entry in manifest.items():
        generated += build_serve_function(route, entry)
        fn_name = fn_name_for_route(route)
        # map keys with slashes need bracket/quote syntax, not bare identifiers
        key_literal = json.dumps(route)
        map_entries.append(f"    {key_literal}: {fn_name}")
        print(f"  - {route} ({entry['type']})")

    generated += "  var map = {\n" + ",\n".join(map_entries) + "\n  };\n"

    new_content = content[:first_serve] + generated + content[map_end:]

    WORKER_FILE.write_text(new_content)
    print(f"\nRegenerated page-serving section: {len(generated)} chars")
    print("Backend logic outside this section was NOT touched.")


if __name__ == "__main__":
    build()
