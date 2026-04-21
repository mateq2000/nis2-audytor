// NIS2 / KSC Audytor — serwer Node.js v4 + RAG
// Uruchomienie: npm install && npm start
// Wymagania: Node.js 18+, plik .env z ANTHROPIC_API_KEY

const express = require('express');
const cors    = require('cors');
const rateLimit = require('express-rate-limit'); // NOWE: Import biblioteki
require('dotenv').config();

const { KNOWLEDGE_BASE } = require('./knowledge-base');

const app  = express();
const PORT = process.env.PORT || 3000;

// NOWE: Railway używa tzw. proxy (serwerów pośredniczących). 
// Ta linijka jest KRYTYCZNA, aby serwer poprawnie rozpoznawał prawdziwe IP użytkownika.
app.set('trust proxy', 1); 

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// NOWE: Konfiguracja limitu - 3 raporty na 24 godziny na jedno IP
const reportLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 godziny w milisekundach
  max: 3, // Maksymalnie 3 zapytania
  message: { error: 'Przekroczono limit darmowych raportów na dzisiaj. Spróbuj ponownie jutro.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// NOWE: Konfiguracja limitu dla szablonów - np. 15 szablonów na dzień
const templateLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, 
  max: 15, 
  message: { error: 'Przekroczono limit generowania dokumentów.' },
});
// ── nazwy sektorów ────────────────────────────────────────────────────────────
const SECTORS = {
  mleczarstwo:            'Mleczarstwo / przetwórstwo mleka',
  przetworstwo_miesne:    'Przetwórstwo mięsne / wędliniarstwo',
  piekarstwo:             'Piekarstwo / cukiernictwo przemysłowe',
  produkcja_zywnosci:     'Produkcja żywności (inne)',
  hurtownia:              'Hurtownia / dystrybucja spożywcza',
  chlodownia:             'Chłodnia / magazyn spożywczy',
  inne:                   'Branża spożywcza — inne',
};

// ── etykiety pytań ────────────────────────────────────────────────────────────
const LABELS = {
  1:    'Zatrudnienie ≥50 pracowników LUB obrót >10 mln EUR (próg UKSC)',
  '1b': 'Firma NIE jest częścią grupy kapitałowej / holdingu (powiązania kapitałowe)',
  2:    'Działalność w sektorze produkcji/dystrybucji żywności (Zał. 2 UKSC)',
  '2b': 'Weryfikacja kodów PKD vs. załączniki 1 i 2 ustawy KSC',
  3:    'Rejestracja w Wykazie KSC przez wykaz-ksc.gov.pl (e-podpis)',
  4:    'Sformalizowana Polityka Bezpieczeństwa Informacji (PBI)',
  5:    'Formalna analiza ryzyka cyberbezpieczeństwa (ostatnie 12 mies.)',
  6:    'Rejestr Aktywów Informacyjnych (systemy IT, serwery, dane)',
  7:    'SZBI regularnie przeglądany i aktualizowany (min. raz w roku)',
  8:    'Plan ciągłości działania i odtwarzania po awarii (BCP/DRP)',
  9:    'Uwierzytelnianie wieloskładnikowe (MFA) w systemach krytycznych',
  10:   'Udokumentowana procedura backup z regularnymi testami',
  11:   'Szyfrowanie danych w spoczynku i podczas transmisji',
  12:   'Zarządzanie aktualizacjami oprogramowania (patch management)',
  13:   'Segmentacja sieci IT (produkcyjna / biurowa / gościnne)',
  14:   'Monitoring logów systemowych i alertów bezpieczeństwa',
  15:   'Udokumentowana procedura zgłaszania incydentów do CSIRT',
  '15b':'Przygotowanie do korzystania z Systemu S46 (od 12 cze 2026)',
  16:   'Ćwiczenia/testy reagowania na incydenty (ostatnie 2 lata)',
  17:   'Weryfikacja bezpieczeństwa kluczowych dostawców IT',
  18:   'Klauzule bezpieczeństwa w umowach z dostawcami IT',
  19:   'Wyznaczona osoba odpowiedzialna za cyberbezpieczeństwo (formalnie)',
  20:   'Szkolenia pracowników i zarządu z cyberbezpieczeństwa (ostatni rok)',
};

// ── budowanie promptu raportu ─────────────────────────────────────────────────
function buildReportPrompt(data) {
  const { firma, nip, workers, revenue, sector, answers, score } = data;

  const answersText = Object.entries(answers)
    .map(([k, v]) => `${k}. ${LABELS[k] || k}: ${v === 'yes' ? 'TAK' : 'NIE'}`)
    .join('\n');

  const gaps = Object.entries(answers)
    .filter(([, v]) => v === 'no')
    .map(([k]) => `- ${LABELS[k] || k}`)
    .join('\n');

  return `Jesteś doświadczonym analitykiem zgodności z ustawą o Krajowym Systemie Cyberbezpieczeństwa (UKSC) z 3 kwietnia 2026 r. Przygotowujesz raport wstępnej analizy luk. Raport ma charakter informacyjny i orientacyjny — nie stanowi porady prawnej. Ostateczna kwalifikacja wymaga weryfikacji przez podmiot lub radcę prawnego.

═══════════════════════════════════════════════════════════
ŻELAZNA REGUŁA — NIESPRZECZNOŚĆ (PRIORYTET ABSOLUTNY):
ZAKAZ: Nie twierdzisz, że firma POSIADA coś, na co odpowiedziała NIE.
ZAKAZ: Nie twierdzisz, że firma NIE MA czegoś, na co odpowiedziała TAK.
ZAKAZ: W sekcji "Luki" nie pojawia się nic, na co firma odpowiedziała TAK.
ZAKAZ: W "Podsumowaniu" nie chwalisz wdrożenia czegoś, na co firma odpowiedziała NIE.
Zanim napiszesz każde zdanie — sprawdź odpowiedzi. Sprzeczność dyskwalifikuje raport.
═══════════════════════════════════════════════════════════

KONTEKST PRAWNY (FAQ Ministerstwa Cyfryzacji, 131 Q&A, kwiecień 2026):
UWAGA: FAQ MC ma charakter interpretacyjny i pomocniczy — nie jest wiążącym aktem prawnym. Każdy podmiot samodzielnie ocenia swój status.
- Samorejestracja: przez wykaz-ksc.gov.pl z e-podpisem, okno 7 maja – 3 października 2026.
- Status jest DEKLARATORYJNY — firma podlega ustawie z chwilą spełnienia przesłanek.
- Samoidentyfikacja: analiza faktycznej działalności ORAZ kodów PKD.
- System S46 (raportowanie incydentów): dostępny od 12 czerwca 2026.
- Wdrożenie SZBI i S46: do 3 kwietnia 2027.
- Kary: podmiot ważny — do 7 mln EUR lub 1,4% obrotu (min. 15 000 zł).
- Odpowiedzialność zarządu: do 300% wynagrodzenia miesięcznego, możliwy zakaz pełnienia funkcji.

KLUCZOWA DISTINKCJA — PODMIOT WAŻNY vs PODMIOT KLUCZOWY (zastosuj w raporcie):

PODMIOT WAŻNY (dotyczy większości firm spożywczych z Załącznika 2):
- Nadzór reaktywny: organ nadzorczy weryfikuje dopiero gdy pojawi się problem.
- Audyt bezpieczeństwa: WYŁĄCZNIE na żądanie organu nadzorczego (brak obowiązkowego cyklu).
- Termin wdrożenia SZBI: do 3 kwietnia 2027.
- Kary: do 7 mln EUR lub 1,4% obrotu.

PODMIOT KLUCZOWY (duże firmy z Załącznika 1, np. duże sieci dystrybucji):
- Nadzór proaktywny i regularny.
- Audyt: obowiązkowo co 3 lata + na żądanie. Pierwszy: do 3 kwietnia 2028.
- Kary: do 10 mln EUR lub 2% obrotu.

WAŻNE: Firmy spożywcze (Załącznik 2 UKSC) to zazwyczaj PODMIOTY WAŻNE. Tylko wyjątkowo duże podmioty mogą być kluczowe. W raporcie używaj odpowiedniej kategorii.

POPRAWNA DEFINICJA PROGU MŚP (Rozp. 651/2014/UE) — ZASTOSUJ DOKŁADNIE:

Małe przedsiębiorstwo (PONIŻEJ progu UKSC): < 50 pracowników ORAZ (obrót ≤ 10 mln EUR LUB suma bilansowa ≤ 10 mln EUR)

Firma PRZEKRACZA próg małego przedsiębiorstwa (potencjalnie podmiot ważny) gdy:
  WARUNEK A: zatrudnienie ≥ 50 pracowników (niezależnie od finansów), LUB
  WARUNEK B: obrót > 10 mln EUR ORAZ suma bilansowa > 10 mln EUR (oba jednocześnie)

UWAGA KRYTYCZNA: Samo przekroczenie obrotu (bez danych o sumie bilansowej) nie jest wystarczające do definitywnej kwalifikacji. Jeśli firma deklaruje obrót > 10 mln EUR ale nie ma danych o sumie bilansowej — napisz, że wymaga to dodatkowej weryfikacji.

UWAGA O GRUPACH KAPITAŁOWYCH: przy grupach kapitałowych sumuje się dane wszystkich spółek powiązanych. Mała firma może przez to przekroczyć próg. Jeśli firma odpowiedziała NIE na pytanie 1b (należy do grupy) — zaznacz wyraźnie, że klasyfikacja wymaga analizy danych skonsolidowanych.

ZAKAZ ARTYKUŁÓW UKSC: Nie cytuj konkretnych numerów artykułów polskiej ustawy KSC. Używaj WYŁĄCZNIE artykułów NIS2 (art. 21 NIS2 itp.) lub ogólnych opisów wymogów.

DANE FIRMY:
Nazwa: ${firma}
NIP: ${nip || 'nie podano'}
Pracownicy: ${workers || 'nie podano'}
Przybliżony obrót: ${revenue || 'nie podano'}
Sektor: ${SECTORS[sector] || sector}
Wynik kwestionariusza: ${score || 0}% zgodności

ODPOWIEDZI Z KWESTIONARIUSZA — FAKTY NIEPODWAŻALNE:
${answersText}

BRAKI (TYLKO te pozycje, niczego więcej):
${gaps || 'BRAK BRAKÓW — firma ma wdrożone wszystkie sprawdzane elementy'}

${KNOWLEDGE_BASE}

STRUKTURA RAPORTU — użyj dokładnie tych nagłówków z prefiksem SEKCJA:

SEKCJA: STATUS KWALIFIKACJI I SAMOIDENTYFIKACJA
Oceń ORIENTACYJNY status podmiotu na podstawie odpowiedzi 1, 1b, 2, 2b. Zastosuj poprawną logikę MŚP. Wyraźnie napisz "orientacyjna ocena" — nie "firma podlega" kategorycznie. Jeśli firma należy do grupy kapitałowej (odpowiedź NIE na 1b) — zaznacz, że klasyfikacja wymaga analizy danych skonsolidowanych. Rozróżnij podmiot ważny od kluczowego i wyjaśnij różnicę w obowiązkach audytowych.

SEKCJA: PODSUMOWANIE WYKONAWCZE
3-4 zdania WYŁĄCZNIE na podstawie odpowiedzi TAK/NIE. Podaj konkretne terminy i ryzyka. Nie dodawaj niczego poza tym co wynika z odpowiedzi.

SEKCJA: ZIDENTYFIKOWANE LUKI I RYZYKA
Opisz WYŁĄCZNIE braki z listy powyżej. Dla każdego: nazwa, praktyczne ryzyko dla zakładu spożywczego, pilność (KRYTYCZNA / WYSOKA / ŚREDNIA). Używaj artykułów NIS2 lub ogólnych opisów. Nie wymieniaj niczego z odpowiedzi TAK.

SEKCJA: HARMONOGRAM DZIAŁAŃ
Faza 1 — do 3 paź 2026: rejestracja (wykaz-ksc.gov.pl, e-podpis), działania pilne
Faza 2 — do 3 kwi 2027: SZBI, dokumentacja, szkolenia, podłączenie S46
Faza 3 — po 3 kwi 2027: ciągłe doskonalenie; audyt tylko gdy organ zażąda (podmiot ważny) lub co 3 lata (podmiot kluczowy)
Tylko działania wynikające z odpowiedzi NIE. Orientacyjny koszt każdego.

SEKCJA: KARY ZA BRAK ZGODNOŚCI
Kwoty dla podmiotu ważnego. Odpowiedzialność zarządu. Przykład dla podanego obrotu.

SEKCJA: NASTĘPNE KROKI W CIĄGU 14 DNI
3 działania (Dni 1-3, Dni 4-7, Dni 8-14) z braków. Koszt każdego.

SEKCJA: ZASTRZEŻENIE PRAWNE
Jedno krótkie zdanie: raport sporządzono na podstawie deklaracji własnych firmy i ma charakter informacyjno-analityczny. Nie stanowi porady prawnej ani wiążącej interpretacji przepisów. Zalecana konsultacja z radcą prawnym przed złożeniem dokumentów do organu nadzoru.

Całość: 850-1050 słów. Czysty tekst — zero markdown, zero gwiazdek.`;
}

// ── budowanie promptu szablonu dokumentu ──────────────────────────────────────
function buildTemplatePrompt(firma, sector, workers, type) {
  const sectorLabel = SECTORS[sector] || sector;

  const templates = {
    polityka: `Napisz kompletny, gotowy do podpisania projekt "Polityki Bezpieczeństwa Informacji" (PBI) dla firmy "${firma}" działającej w sektorze: ${sectorLabel}, zatrudniającej ${workers || 'kilkadziesiąt'} pracowników. Dokument ma być zgodny z wymogami art. 21 dyrektywy NIS2 i UKSC z 2026 r.

Zawrzyj następujące sekcje:
1. Cel i zakres dokumentu
2. Definicje (cyberbezpieczeństwo, incydent, SZBI, aktywo informacyjne)
3. Podział odpowiedzialności (Zarząd, osoba odpowiedzialna za cyber, pracownicy IT, wszyscy pracownicy)
4. Zasady ochrony systemów IT (konkretne reguły dla zakładu spożywczego: ERP, systemy wagowe, linie produkcyjne, e-mail, dostęp zdalny)
5. Zarządzanie hasłami i dostępem uprzywilejowanym (MFA)
6. Procedura tworzenia i testowania kopii zapasowych
7. Zarządzanie urządzeniami zewnętrznymi i prywatnym sprzętem (BYOD)
8. Bezpieczeństwo pracy zdalnej
9. Szkolenia i świadomość bezpieczeństwa
10. Przegląd i aktualizacja dokumentu (min. raz w roku lub po incydencie)
Na końcu: miejsca na podpis Prezesa/Zarządu, datę wdrożenia i datę następnego przeglądu.
Objętość: 700–900 słów. Format: gotowy dokument firmowy. Pisz czystym tekstem — bez markdown.`,

    incydenty: `Napisz kompletną "Procedurę Zgłaszania i Obsługi Incydentów Cyberbezpieczeństwa" dla firmy "${firma}" z sektora ${sectorLabel}. Dokument ma być zgodny z wymogami UKSC z 2026 r. (terminy: 24h wstępne, 72h szczegółowe, 1 miesiąc końcowe) i gotowy do druku na ścianę.

Zawrzyj:
1. Definicja incydentu cyberbezpieczeństwa (z przykładami typowymi dla zakładu spożywczego: atak ransomware na ERP, wyciek danych dostawców, awaria systemu HACCP/MES, phishing pracownika)
2. Klasyfikacja incydentów — poważny vs. mniej poważny (kryteria)
3. Procedura krok po kroku: kto dzwoni do kogo, w jakim czasie — schemat eskalacji
4. Dane kontaktowe do obowiązkowego zgłoszenia:
   - CSIRT NASK: incydent@cert.pl, tel. 799 448 084
   - System S46 (od 12 czerwca 2026): platforma MC do elektronicznego zgłoszenia
5. Formularz zgłoszeniowy incydentu (pola: data/godzina wykrycia, opis, dotknięte systemy, podjęte działania, osoba zgłaszająca)
6. Działania po incydencie (co zachować jako dowód, jak nie niszczyć śladów)
7. Wyciągnięcie wniosków i aktualizacja procedury
Pisz czystym tekstem — bez markdown. Format: operacyjna instrukcja do wydruku.`,

    rejestr: `Napisz szablon "Rejestru Aktywów Informacyjnych" dla firmy "${firma}" z sektora ${sectorLabel}. Rejestr jest wymagany przez UKSC jako podstawa analizy ryzyka.

Zawrzyj:
1. Instrukcję wypełniania i aktualizacji rejestru (kto, kiedy, jak często)
2. Tabelę z kolumnami: ID, Nazwa aktywa, Typ (sprzęt/oprogramowanie/dane/usługa zewnętrzna), Właściciel, Lokalizacja fizyczna/chmura, Klasyfikacja (krytyczny/ważny/standardowy), Backup (tak/nie/częstotliwość), Powiązane systemy, Uwagi
3. Przykładowo wypełnione 12 wierszy TYPOWYCH dla zakładu spożywczego, np.:
   - System ERP (np. SAP, Comarch)
   - System MES / SCADA linii produkcyjnych
   - Stacje wagowe i etykietowania
   - System HACCP / dokumentacja jakości
   - Serwer plików z recepturami i dokumentacją
   - Serwer poczty e-mail
   - System CRM / baza danych klientów
   - Backup NAS / chmura
   - Urządzenia mobilne pracowników
   - Oprogramowanie księgowe
   - VPN dostępu zdalnego
   - System monitoringu CCTV zakładu
4. Instrukcję klasyfikacji aktywów (co jest "krytyczne" w branży spożywczej)
Pisz czystym tekstem — bez markdown.`,

    ryzyko: `Napisz "Matrycę Analizy Ryzyka Cyberbezpieczeństwa" dla firmy "${firma}" z sektora ${sectorLabel}.

Zawrzyj:
1. Krótką instrukcję metodologii (skala prawdopodobieństwa 1-5, skala wpływu 1-5, poziom ryzyka = P × W)
2. Tabelę z kolumnami: ID, Zagrożenie, Aktywo, Prawdopodobieństwo (1-5), Wpływ (1-5), Poziom ryzyka, Obecne zabezpieczenia, Zalecane działanie, Właściciel
3. Minimum 12 konkretnych zagrożeń typowych dla zakładu spożywczego, np.:
   - Atak ransomware na serwer ERP (zatrzymanie produkcji)
   - Phishing pracownika (wyciek danych logowania)
   - Awaria systemu SCADA/MES (wstrzymanie linii)
   - Wyciek danych receptur do konkurencji
   - Atak na system HACCP (zagrożenie bezpieczeństwa żywności)
   - Nieautoryzowany dostęp zdalny (np. przez VPN dostawcy ERP)
   - Brak ciągłości chłodniczej przez cyberatak
   - Fałszywe faktury (BEC — Business Email Compromise)
   - Atak na stronę WWW i sklep internetowy
   - Wewnętrzne zagrożenie (niezadowolony pracownik)
   - Utrata danych przez awarię sprzętu (brak backupu)
   - Kompromitacja dostawcy IT (atak przez łańcuch dostaw)
4. Podsumowanie: top 3 ryzyka do natychmiastowego adresowania
Pisz czystym tekstem — bez markdown.`,

    szkolenie: `Napisz "Program Szkolenia Pracowników z Cyberbezpieczeństwa" dla firmy "${firma}" z sektora ${sectorLabel}.

Zawrzyj:
1. Cel i podstawa prawna szkolenia (art. 21 NIS2, UKSC 2026)
2. Grupy docelowe i zakres:
   - Zarząd (2h): odpowiedzialność osobista, UKSC, decyzje inwestycyjne
   - Pracownicy IT (4h): SZBI, reagowanie na incydenty, zarządzanie systemami
   - Wszyscy pracownicy (1,5h): phishing, hasła, urządzenia mobilne, praca zdalna
3. Szczegółowy konspekt modułu dla WSZYSTKICH PRACOWNIKÓW (1,5h):
   Moduł 1 (20 min): Co to jest cyberbezpieczeństwo i dlaczego dotyczy mnie
   Moduł 2 (30 min): Jak rozpoznać phishing — 10 przykładów e-maili i SMS-ów
   Moduł 3 (20 min): Bezpieczne hasła i MFA (praktyczne ćwiczenie)
   Moduł 4 (15 min): Bezpieczna praca na telefonie i komputerze firmowym
   Moduł 5 (5 min): Co zrobić gdy podejrzewam incydent — numer telefonu i procedura
4. Test wiedzy (10 pytań jednokrotnego wyboru) — gotowy do wydruku lub wgrania do platformy e-learning
5. Lista obecności do podpisania (wymóg UKSC — dowód przeprowadzenia szkolenia)
6. Harmonogram szkoleń: pierwsze do 3 kwi 2027, powtarzanie co 12 miesięcy
Pisz czystym tekstem — bez markdown.`,
  };

  return templates[type] || templates.polityka;
}

// ── POST /generate-report ─────────────────────────────────────────────────────
app.post('/generate-report', reportLimiter, async (req, res) => {
  const data = req.body;
  if (!data.firma || !data.answers || Object.keys(data.answers).length < 10) {
    return res.status(400).json({ error: 'Uzupełnij dane firmy i odpowiedz na co najmniej 10 pytań.' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        messages: [{ role: 'user', content: buildReportPrompt(data) }],
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || `Błąd API: ${response.status}`);
    }

    const apiData = await response.json();
    res.json({ success: true, report: apiData.content[0].text });

  } catch (err) {
    console.error('[generate-report]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /generate-template ───────────────────────────────────────────────────
app.post('/generate-template', templateLimiter, async (req, res) => {
  const { firma, sector, workers, templateType } = req.body;
  if (!firma || !templateType) {
    return res.status(400).json({ error: 'Brak wymaganych danych.' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        messages: [{ role: 'user', content: buildTemplatePrompt(firma, sector, workers, templateType) }],
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || `Błąd API: ${response.status}`);
    }

    const apiData = await response.json();
    res.json({ success: true, document: apiData.content[0].text });

  } catch (err) {
    console.error('[generate-template]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /scan-domain ─────────────────────────────────────────────────────────
app.post('/scan-domain', async (req, res) => {
  const { domain } = req.body;
  if (!domain) return res.status(400).json({ error: 'Podaj domenę.' });

  const checks = [];

  // HTTPS
  try {
    const r = await fetch(`https://${domain}`, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000),
    });
    checks.push({
      name: 'Szyfrowanie HTTPS',
      status: r.ok ? 'ok' : 'warning',
      detail: r.ok ? 'Strona używa HTTPS — podstawowe szyfrowanie jest aktywne.' : 'Problem z połączeniem HTTPS.',
    });
  } catch {
    checks.push({ name: 'Szyfrowanie HTTPS', status: 'error', detail: 'Nie można potwierdzić HTTPS — możliwy brak szyfrowania.' });
  }

  // SPF przez Cloudflare DNS-over-HTTPS
  try {
    const r = await fetch(`https://cloudflare-dns.com/dns-query?name=${domain}&type=TXT`, {
      headers: { Accept: 'application/dns-json' },
      signal: AbortSignal.timeout(5000),
    });
    const d = await r.json();
    const txt = (d.Answer || []).map(a => a.data).join(' ');
    const hasSPF  = txt.includes('v=spf1');
    const hasDMARC = txt.includes('v=DMARC1') || false;
    checks.push({
      name: 'Ochrona e-mail (SPF)',
      status: hasSPF ? 'ok' : 'error',
      detail: hasSPF
        ? 'Rekord SPF istnieje — ochrona przed podszywaniem się pod firmowy e-mail.'
        : 'Brak rekordu SPF — możliwe podszywanie się pod firmowy adres e-mail (ryzyko BEC).',
    });
  } catch {
    checks.push({ name: 'Ochrona e-mail (SPF)', status: 'warning', detail: 'Nie można zweryfikować SPF.' });
  }

  checks.push({
    name: 'Skanowanie portów i podatności',
    status: 'info',
    detail: 'Pełny skan zewnętrznej powierzchni ataku dostępny w pakiecie rozszerzonym.',
  });

  checks.push({
    name: 'Weryfikacja wycieków danych (HIBP)',
    status: 'info',
    detail: 'Sprawdzenie czy adresy e-mail domeny wyciekły dostępne w pakiecie rozszerzonym.',
  });

  res.json({ success: true, results: { domain, checks } });
});

// ── health check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', version: '4.0.0' }));

app.listen(PORT, () => console.log(`NIS2 Audytor v4 działa na porcie ${PORT}`));
