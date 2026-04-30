"""Graft Spray spec markdown-to-PDF builder.

Reads `docs/spec/Graft-Spray-App-Spec.md`, converts to HTML with markdown
extensions (tables, fenced code, sane lists), resolves diagram paths to
absolute, applies print-oriented CSS, and writes a PDF via xhtml2pdf with
page numbers in the footer.

Reproducibility:

    pip install markdown==3.10.2 xhtml2pdf==0.2.17
    python docs/spec/_source/build-pdf.py

Run from anywhere; the script computes the spec directory relative to its own
location.
"""

from pathlib import Path
import sys

import markdown
from xhtml2pdf import pisa

# Resolve paths relative to this script's location (docs/spec/_source/).
SCRIPT_DIR = Path(__file__).resolve().parent
SPEC_DIR = SCRIPT_DIR.parent
MD_PATH = SPEC_DIR / "Graft-Spray-App-Spec.md"
PDF_PATH = SPEC_DIR / "Graft-Spray-App-Spec.pdf"
DIAGRAMS_DIR = SPEC_DIR / "diagrams"

print(f"reading {MD_PATH}")
md_text = MD_PATH.read_text(encoding="utf-8")

print("converting markdown -> HTML")
html_body = markdown.markdown(
    md_text,
    extensions=["tables", "fenced_code", "sane_lists"],
)

# Resolve relative diagram paths to absolute file URIs so xhtml2pdf can find them.
diagrams_abs = DIAGRAMS_DIR.as_posix()
html_body = html_body.replace('src="diagrams/', f'src="{diagrams_abs}/')

CSS = """
@page {
  size: letter;
  margin: 0.85in 0.75in 0.75in 0.75in;
  @frame footer {
    -pdf-frame-content: footer-content;
    bottom: 0.35in; left: 0.75in; right: 0.75in; height: 0.25in;
  }
}
body {
  font-family: Helvetica, Arial, sans-serif;
  font-size: 9.5pt;
  line-height: 1.35;
  color: #222;
}
h1 {
  font-size: 22pt;
  margin: 10pt 0 12pt;
  color: #1a1a1a;
}
h2 {
  font-size: 15pt;
  margin: 16pt 0 8pt;
  color: #2a2a2a;
  border-bottom: 0.5pt solid #ccc;
  padding-bottom: 3pt;
  page-break-before: always;
}
h3 {
  font-size: 12pt;
  margin: 10pt 0 5pt;
  color: #333;
}
h4 {
  font-size: 10.5pt;
  margin: 8pt 0 3pt;
  color: #444;
}
p { margin: 4pt 0; }
strong { color: #111; }
em { color: #333; }
table {
  border-collapse: collapse;
  margin: 6pt 0 8pt;
  width: 100%;
}
th, td {
  border: 0.5pt solid #bbb;
  padding: 3pt 5pt;
  vertical-align: top;
  font-size: 8.5pt;
}
th {
  background: #eee;
  font-weight: bold;
  color: #1a1a1a;
}
code {
  font-family: "Courier New", monospace;
  font-size: 8.5pt;
  background: #f3f3f3;
  padding: 1pt 3pt;
}
pre {
  background: #f3f3f3;
  padding: 5pt 7pt;
  font-size: 8pt;
  white-space: pre-wrap;
  margin: 5pt 0;
}
pre code {
  background: transparent;
  padding: 0;
}
blockquote {
  border-left: 2pt solid #888;
  margin: 6pt 0;
  padding: 3pt 8pt;
  color: #444;
  font-style: italic;
}
img {
  max-width: 100%;
  margin: 5pt 0;
}
hr {
  border: 0.5pt solid #ddd;
  margin: 10pt 0;
}
ul, ol {
  margin: 4pt 0 4pt 16pt;
}
li {
  margin: 2pt 0;
}
"""

html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Graft Spray Application Specification</title>
<style>{CSS}</style>
</head>
<body>
{html_body}
<div id="footer-content" style="text-align:center; font-size:7.5pt; color:#888;">
  Graft Spray Application Specification, v1.0 DRAFT, 2026-04-30, page <pdf:pagenumber /> of <pdf:pagecount />
</div>
</body>
</html>
"""

print(f"writing {PDF_PATH}")
with open(PDF_PATH, "wb") as out:
    result = pisa.CreatePDF(html, dest=out, encoding="utf-8")

if result.err:
    print(f"FAILED with {result.err} errors")
    sys.exit(1)

size_kb = PDF_PATH.stat().st_size / 1024
print(f"OK: {PDF_PATH} written, {size_kb:.1f} KB")
