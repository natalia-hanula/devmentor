# D20 — Port płatności z adapterem mock w 1.0; adapter Stripe test mode jako osobne zadanie
- Date, owner: 2026-10-18, Natalia; źródło: odpowiedź na blokery backlogu 2026-10-18 (Q16)
- Context and the options weighed: R03 (wyłącznie Stripe) vs `AGENTS.md` (port integracji, adapter mock na MVP); prawdziwe płatności i tak czekają na regulamin (Q09).
- Decision and why: 1.0 kursowe ma port płatności i adapter mock. Adapter Stripe w trybie testowym to osobne zadanie, które nie blokuje 1.0 i zostaje w backlogu. R03 obowiązuje dla prawdziwych płatności.
- Consequences, and what would make us revisit it: do adaptera Stripe i regulaminu (Q09) nie da się przyjąć prawdziwej płatności, więc kryteria popytu (D11) nie mogą zostać zmierzone.
- Status: active
