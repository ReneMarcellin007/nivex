# -*- coding: utf-8 -*-
"""Contrôles d'accessibilité et de référencement sur le HTML rendu."""
import re, sys, urllib.request

url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3000/fr"
html = urllib.request.urlopen(url, timeout=20).read().decode("utf-8", "replace")

print(f"=== {url} ===\n")
checks = [
    ("attribut lang",                 bool(re.search(r'<html[^>]*lang="(fr|en)-CA"', html))),
    ("titre de page",                 bool(re.search(r'<title>.+</title>', html))),
    ("meta description",              'name="description"' in html),
    ("liens alternates de langue",    'hreflang' in html or 'rel="alternate"' in html),
    ("balisage LocalBusiness",        '"HomeAndConstructionBusiness"' in html),
    ("balisage FAQ",                  '"FAQPage"' in html),
    ("lien d'évitement",              ('Aller au contenu' in html) or ('Skip to content' in html)),
    ("repère <main>",                 '<main' in html),
    ("un seul <h1>",                  html.count('<h1') == 1),
]

imgs = re.findall(r'<img\b[^>]*>', html)
checks.append((f"images avec alt ({len(imgs)})", all('alt=' in i for i in imgs)))

svgs = re.findall(r'<svg\b[^>]*>', html)
nus = [s for s in svgs if not any(k in s for k in ('aria-hidden', 'aria-label', 'role='))]
checks.append((f"svg étiquetés ou masqués ({len(svgs)})", not nus))

inputs = re.findall(r'<(?:input|textarea|select)\b[^>]*>', html)
unlabelled = [i for i in inputs if 'aria-label' not in i and 'id=' not in i and 'type="hidden"' not in i]
checks.append((f"champs étiquetables ({len(inputs)})", not unlabelled))

fails = 0
for name, ok in checks:
    print(("  ✓ " if ok else "  ✗ ") + name)
    fails += 0 if ok else 1

if nus:
    print("\n  svg sans étiquette :")
    for s in nus[:4]:
        print("   ", s[:90])
if unlabelled:
    print("\n  champs sans étiquette :")
    for i in unlabelled[:4]:
        print("   ", i[:90])

print(f"\n{len(checks) - fails}/{len(checks)} contrôles réussis")
sys.exit(1 if fails else 0)
