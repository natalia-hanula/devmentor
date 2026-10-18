# D10 — Definicja „realnego mentora” w teście podaży
- Date, owner: 2026-10-18, Natalia; źródło: sesja om-discover 2026-10-18 (rozszerzenie po recenzji)
- Context and the options weighed: opublikowanie slotu nic mentora nie kosztuje; mentorzy z listy (2026-09-03) stawiali warunki: znajomi na platformie, pierwszy booking od znajomego, brak konta bankowego przed rezerwacją.
- Decision and why: mentor liczy się w teście podaży, gdy spełnia wszystkie: (1) opublikował slot, (2) ustawił cenę, (3) udostępnił swój link własnej publiczności co najmniej raz, (4) zgodził się przejść Stripe Connect przed pierwszą wypłatą — nie przed rezerwacją, zgodnie z warunkiem mentorów.
- Consequences, and what would make us revisit it: wymaga sposobu stwierdzenia, że link został udostępniony (nieustalony). Ustala moment onboardingu Stripe: po rezerwacji, przed wypłatą.
- Status: active
