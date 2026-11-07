# Ireland rugby: handover (2 Nov 2026)

## State
Live: home, five team pages, tables, match pages with scorers, players, player pages, Ireland selection by province, scorers, head to head, history, shirts. Noindex, not announced.
Team sheets since 2020 are collecting newest first. Scorers: 521 of 625 matches add up (2 Nov 2026), and the file is a snapshot until `tools/build_scorers.py` is rerun on Richard's Mac. Shirts: 160 chosen from 259 photos.

## Next task
None in progress. A weekly scheduled task refreshes scorers and re-checks provincial fixtures (needs Richard's Mac on, with the desktop app open). Richard still to decide on the shirt photo rights before launch.

## Open items
- Fixtures need re-checking against the teams' sites (`tools/fixtures_src.txt`), and Ireland's Six Nations 2027 games added if the feed lacks them.
- Venue names for Leinster's Champions Cup home games are blank until confirmed.
- connacht.png, leinster.png and ulster.png in Richard's folder are white only, so they sit on team-colour tiles.
- Ground photos not collected. Shirts page uses retailer photos with source links: no permission obtained, decide before launch.
- Paid plan before live scores. Missing scorers: mostly 2020-22 URC and European matches and Ireland tours.
- `_site-export.tgz` left in Richard's asset folder can be deleted.

## Feed test results (live data, 2 Nov 2026, Highlightly free plan)
- No future URC or European fixtures in the feed: only finished matches. Ireland's upcoming Tests are listed.
Sample: 12 finished matches opened (11 provincial, 1 Ireland), plus match lists, one table and one highlight.
- Free plan reports "All data available with current plan"; no route tested was blocked.
- Fixtures and scores: all five teams, URC, Champions Cup, Six Nations, Nations Championship, Tests. Lists go back to autumn 2020.
- Team sheets: 10 of 12 full or nearly so. The 2 empty were the newest matches (30 and 31 Oct), so they may fill in late; not confirmed.
- Two sheets were a player short (14 starters; once 14 + 7). Handle gaps.
- Positions in the sample are only Forward or Back, so the shirt number has to carry the real position.
- Venue and referee were empty on every 2026-27 match opened; present on 2025-26 matches and the Ireland match.
- No scorers or events in match detail, and the docs list no route for them.
- Tables: wins, draws, losses, points, points for and against. No bonus-point or try columns.
- Highlights: official YouTube embeds seen (IrishRugby TV), with match links.
- Team logos: null for all four provinces and some others (e.g. Glasgow), present for Ireland. Team crests must come from our own files.

## Competitions (7 Nov 2026)
- Titles section renamed Competitions. 143 entries: 132 championship seasons (1883-2026), 10 World Cups, the 2020 Autumn Nations Cup. Won ones highlighted in gold, with filters (Won, Grand Slams, Triple Crowns, World Cups, each championship era, wooden spoons).
- Each competition page: table, Ireland's record and scorers, a card per Ireland match (scorers, Ireland team, line-up diagram when Commons has one), other results; World Cups add the final and knockout results.
- Each World Cup final has its own page (`/final/?y=`): both teams, scorers, both line-ups, facts, road to the final.
- The World Cup page links every year and every final.
- Gaps: Wikipedia has no team lists or scorers for many seasons before about 1990; 1885 has no match details.
- Team pages (7 Nov 2026): 57 teams from the tables and old championships and World Cups. Squads, grounds and links come from Wikipedia and Wikidata, so they can lag behind; rebuild after transfer windows. Coach left blank where the infobox was unclear (Bristol, Exeter).
- The five Irish team sections now carry the same details: official links (taken from each team's own website), grounds, coach, captain, squad.
- Open: shirt photo rights before launch; delete `_site-export.tgz`, `_titles-export.tgz`, `_comps-export.tgz` from the assets folder.
