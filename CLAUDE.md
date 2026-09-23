# CLAUDE.md

## Arbeitsumgebung und Versionskontrolle

**Arbeitsort:** ausschließlich `C:\Users\ali\Desktop\GitHub\Interface-Krems`,
Zweig `main`. Kein anderer Ordner (insbesondere nicht der frühere
`GI_2.0`-Ordner) wird verwendet.

**Veröffentlichung:** Jeder Push auf `main` wird sofort über GitHub Pages
veröffentlicht - es gibt keine Staging-Stufe dazwischen.

**Commits/Push:** Claude Code committet und pusht nicht. Der Nutzer
committet und pusht nach jeder Freigabe selbst.

**Verifikation:** Änderungen und Rückbauten (z. B. temporäre Testkopien von
CSV-Dateien) werden immer per `git diff` bzw. `git diff --stat` belegt,
nicht nur per `grep` oder Dateizeitstempel.

**Cache-Busting:** Kein Cache-Busting (z. B. `?v=...`-Parameter) in
Projektdateien - weder dauerhaft noch temporär. Bei Cache-Problemen wird
stattdessen der Testserver unten verwendet bzw. das Problem zurückgemeldet,
statt Dateien zu ändern.

**Testserver:** Liefert `Cache-Control: no-store` auf jede Antwort und
löst damit das zuvor wiederholt aufgetretene Problem veralteter
Testauslieferungen (siehe `docs/PROJEKTLOG.md`, Eintrag 28, Punkt 4). Liegt
dauerhaft außerhalb des Repositorys:

- Speicherort: `C:\Users\ali\Desktop\GitHub\Interface-Krems-Testserver\nocache_server.py`
- Start: `python nocache_server.py "C:\Users\ali\Desktop\GitHub\Interface-Krems" 8845`
- Port: `8845`

Alle Verifikationen laufen künftig über diesen Server, nicht mehr über
`python -m http.server` ohne Zusatz.
