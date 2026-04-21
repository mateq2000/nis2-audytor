# Wdrożenie na Railway.app — instrukcja krok po kroku

## Co to jest Railway?
Railway to platforma hostingowa która uruchamia Twój serwer Node.js w internecie.
Po wdrożeniu dostaniesz link np. `https://nis2-audytor.up.railway.app` — wysyłasz go testującym.

---

## KROK 1 — Przygotowanie plików (zrób raz)

Upewnij się że masz te pliki w jednym folderze:
```
nis2-finalna/
├── server.js
├── knowledge-base.js
├── package.json
├── railway.json
├── .gitignore
├── .env.example
└── public/
    └── index.html
```

---

## KROK 2 — Wrzuć kod na GitHub

1. Wejdź na github.com i zaloguj się (lub utwórz konto)
2. Kliknij "New repository" → nazwa: `nis2-audytor` → Public → Create
3. Na stronie repozytorium kliknij "uploading an existing file"
4. Przeciągnij WSZYSTKIE pliki z folderu `nis2-finalna` (bez folderu node_modules!)
5. Kliknij "Commit changes"

WAŻNE: NIE wrzucaj pliku `.env` — zawiera klucz API!

---

## KROK 3 — Wdrożenie na Railway

1. Wejdź na **railway.app** i zaloguj się przez GitHub
2. Kliknij **"New Project"**
3. Wybierz **"Deploy from GitHub repo"**
4. Wybierz repozytorium `nis2-audytor`
5. Railway automatycznie wykryje Node.js i zacznie budować

---

## KROK 4 — Dodanie klucza API (KRYTYCZNE)

Po deployu:
1. Kliknij na swój projekt w Railway
2. Zakładka **"Variables"**
3. Kliknij **"New Variable"**
4. Wpisz:
   - Nazwa: `ANTHROPIC_API_KEY`
   - Wartość: `sk-ant-api03-TWÓJ_KLUCZ` (z console.anthropic.com)
5. Kliknij **"Add"**
6. Railway automatycznie zrestartuje serwer

---

## KROK 5 — Własna domena (opcjonalnie)

W Railway → Settings → Domains:
- "Generate Domain" = darmowa domena railway.app
- "Custom Domain" = własna domena np. `audytksc.pl`

Domenę `.pl` kupisz na: domains.google.com, ovh.pl, home.pl (ok. 50-80 zł/rok)

---

## KROK 6 — Test po wdrożeniu

Otwórz swój link (np. https://nis2-audytor.up.railway.app) i sprawdź:
- [ ] Strona się ładuje
- [ ] Pytania można kliknąć (TAK/NIE reaguje)
- [ ] Dashboard pojawia się po kilku odpowiedziach
- [ ] Raport generuje się po wypełnieniu formularza

---

## Koszty Railway

- **Hobby plan**: 5 USD/miesiąc = ~20 zł — wystarczy na 100+ raportów dziennie
- **Free trial**: Railway daje $5 kredytu na start (ok. 1 miesiąc za darmo)
- **Claude API**: ok. 0,30-0,60 zł za jeden wygenerowany raport

---

## Aktualizacja aplikacji (po zmianach w kodzie)

1. Zmień plik lokalnie
2. Na GitHub.com → twoje repo → edytuj plik → Commit
3. Railway automatycznie wykryje zmianę i wdroży nową wersję (ok. 2-3 minuty)

---

## Troubleshooting

**Aplikacja nie działa po deployu:**
→ Railway → projekt → zakładka "Logs" → sprawdź błędy
→ Najczęstszy problem: brak zmiennej ANTHROPIC_API_KEY

**"Cannot find module './knowledge-base'":**
→ Sprawdź czy plik knowledge-base.js jest w repozytorium (nie w .gitignore)

**Raport się nie generuje:**
→ Otwórz DevTools (F12) → zakładka Network → sprawdź czy /generate-report zwraca błąd
→ Sprawdź czy klucz API jest aktywny na console.anthropic.com

**Strona działa lokalnie ale nie na Railway:**
→ Sprawdź czy API URL w index.html poprawnie wykrywa środowisko (już jest auto-detect)
