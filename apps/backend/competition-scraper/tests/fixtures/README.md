# Provider fixture provenance

Every FFVB HTML/CSV fixture and the LNV Data Project HTML fixture is a reduced
excerpt of a public provider response captured on 2026-07-20. Reduction keeps
the original elements and values read by the parser; it only removes unrelated
layout, scripts, assets, and additional rows.

The live LNV XML endpoints returned HTTP 403 during REF-025, including after a
normal public-site session. The XML fixtures are reduced excerpts of the official
responses archived by the Internet Archive on 2023-01-30. Tests cover current
transport failures through injected exceptions while reusing real parser inputs.
