"""
Keep collection out of tests/fixtures/.

`fixtures/repo-hostile/notes` is a symlink to `../..` on purpose — it is the
committed symlink the confinement rules have to survive. unittest's discovery
ignores it (no `__init__.py`), but pytest follows it, re-collecting this whole
directory ~40 times through the loop before it gives up.
"""
collect_ignore_glob = ["fixtures/*"]
