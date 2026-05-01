// NIS2 / KSC Audytor — serwer Node.js v4 + RAG
// Uruchomienie: npm install && npm start
// Wymagania: Node.js 18+, plik .env z ANTHROPIC_API_KEY

const express = require('express');
const cors    = require('cors');
require('dotenv').config();

const { KNOWLEDGE_BASE } = require('./knowledge-base');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

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

WAŻNE: W nagłówku dokumentu użyj roku 2026 (nie 2025). Numer dokumentu: PBI-001/2026. Data opracowania: 2026.
Pisz czystym tekstem — bez markdown, bez gwiazdek.

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

    rejestr: `Napisz szablon "Rejestru Aktywów Informacyjnych" dla firmy "${firma}" z sektora ${sectorLabel}. Rejestr jest wymagany przez UKSC jako podstawa analizy ryzyka. W nagłówku użyj roku 2026.

Zawrzyj:
1. Instrukcję wypełniania i aktualizacji rejestru (kto, kiedy, jak często)
2. Tabelę z kolumnami: ID, Nazwa aktywa, Typ, Właściciel, Lokalizacja/chmura, Klasyfikacja (krytyczny/ważny/standardowy), Backup, Powiązane systemy, Uwagi
3. Dokładnie 12 wierszy TYPOWYCH dla zakładu spożywczego:
   1. System ERP (np. Comarch)
   2. System MES/SCADA linii produkcyjnych
   3. Stacje wagowe i etykietowania
   4. System HACCP i dokumentacja jakości
   5. Serwer plików z recepturami i dokumentacją technologiczną
   6. Serwer poczty e-mail (Microsoft 365 lub lokalny)
   7. System CRM i baza danych klientów/kontrahentów
   8. Backup NAS i kopia offsite/chmura
   9. Urządzenia końcowe (komputery, laptopy pracownicze)
   10. VPN dostępu zdalnego
   11. Systemy chłodnicze/BMS podłączone do sieci
   12. Serwer plików kadrowo-finansowych
4. Krótką instrukcję klasyfikacji aktywów: co jest "krytyczne" vs "ważne" w branży spożywczej
Pisz czystym tekstem — bez markdown.`,

    ryzyko: `Napisz "Matrycę Analizy Ryzyka Cyberbezpieczeństwa" dla firmy "${firma}" z sektora ${sectorLabel}. Data opracowania: 2026.

Zawrzyj:
CZĘŚĆ 1 — METODOLOGIA (skala P 1-5, skala W 1-5, ryzyko = P×W, interpretacja: 1-4 niskie, 5-9 średnie, 10-14 wysokie, 15-25 krytyczne)

CZĘŚĆ 2 — MATRYCA (dokładnie 13 zagrożeń, każde z polami: ID, Zagrożenie, Aktywo, P, W, Poziom ryzyka, Obecne zabezpieczenia, Zalecane działanie, Właściciel):
R-01: Atak ransomware na ERP
R-02: Phishing — wyciek danych logowania
R-03: Awaria SCADA/MES — wstrzymanie produkcji
R-04: Wyciek receptur do konkurencji
R-05: Cyberatak na system HACCP
R-06: Nieautoryzowany dostęp VPN dostawcy
R-07: Cyberatak na systemy chłodnicze
R-08: Atak BEC — fałszywe faktury
R-09: Atak na stronę WWW
R-10: Zagrożenie wewnętrzne — pracownik
R-11: Utrata danych przez awarię sprzętu
R-12: Atak przez łańcuch dostaw IT
R-13: Nieautoryzowany fizyczny dostęp do serwerowni

CZĘŚĆ 3 — TOP 3 ryzyka do natychmiastowego adresowania z uzasadnieniem.
Pisz czystym tekstem — bez markdown.`,

    szkolenie: `Napisz "Program Szkolenia Pracowników z Cyberbezpieczeństwa" dla firmy "${firma}" z sektora ${sectorLabel}. Data opracowania: 2026.

CZĘŚĆ I — CEL I PODSTAWA PRAWNA (art. 21 NIS2, art. 20 NIS2 odpowiedzialność zarządu, UKSC 2026, ISO 27001)

CZĘŚĆ II — GRUPY DOCELOWE I ZAKRES:
- Zarząd (2h): odpowiedzialność osobista, UKSC, decyzje inwestycyjne, scenariusz kryzysowy
- Pracownicy IT (4h): SZBI, reagowanie na incydenty, OT/SCADA, zarządzanie systemami
- Wszyscy pracownicy (1,5h): szczegółowy konspekt poniżej

CZĘŚĆ III — KONSPEKT DLA WSZYSTKICH PRACOWNIKÓW (1,5h):
Moduł 1 (20 min): Czym jest cyberbezpieczeństwo — przykłady ataków na mleczarnie i firmy spożywcze w Polsce i Europie
Moduł 2 (30 min): Phishing — 8 przykładów e-maili phishingowych z opisem jak je rozpoznać
Moduł 3 (20 min): Bezpieczne hasła i MFA — praktyczne zasady i ćwiczenie
Moduł 4 (15 min): Bezpieczna praca zdalna i na urządzeniach mobilnych
Moduł 5 (5 min): Procedura zgłaszania incydentu — kto, jak, numer telefonu

CZĘŚĆ IV — TEST WIEDZY (10 pytań jednokrotnego wyboru z odpowiedziami)

CZĘŚĆ V — LISTA OBECNOŚCI (szablon do wydruku z podpisami)

CZĘŚĆ VI — HARMONOGRAM (pierwsze szkolenie do 3 kwi 2027, powtarzanie co 12 miesięcy)
Pisz czystym tekstem — bez markdown.`,
  };

  return templates[type] || templates.polityka;
}

// ── POST /generate-report ─────────────────────────────────────────────────────
app.post('/generate-report', async (req, res) => {
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
        max_tokens: 6000,
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
app.post('/generate-template', async (req, res) => {
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
        max_tokens: 8000,
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
    detail: 'Wymaga pełnego audytu technicznego. Skontaktuj się z nami: mateusz.sidor@interia.eu',
  });

  checks.push({
    name: 'Weryfikacja wycieków danych (HIBP)',
    status: 'info',
    detail: 'Sprawdzenie czy firmowe adresy e-mail wyciekły w znanych bazach danych. Skontaktuj się: mateusz.sidor@interia.eu',
  });

  res.json({ success: true, results: { domain, checks } });
});

// ── POST /send-report — wysyłka raportu emailem przez Resend ──────────────────
app.post('/send-report', async (req, res) => {
  const { email, firma, reportText } = req.body;
  if (!email || !reportText) {
    return res.status(400).json({ error: 'Brak adresu e-mail lub treści raportu.' });
  }

  // Jeśli brak klucza Resend — zwróć sukces bez wysyłki (tryb demo)
  if (!process.env.RESEND_API_KEY) {
    console.log(`[send-report] RESEND_API_KEY nie ustawiony — raport dla ${email} nie wysłany (tryb demo)`);
    return res.json({ success: true, demo: true });
  }

  // Konwersja tekstu raportu na prosty HTML
  const htmlBody = reportText
    .split('\n\n')
    .map(p => {
      const trimmed = p.trim();
      if (!trimmed) return '';
      if (trimmed.startsWith('SEKCJA:')) {
        const title = trimmed.replace('SEKCJA:', '').trim();
        return `<h2 style="color:#185FA5;font-size:15px;font-family:sans-serif;margin:24px 0 8px;border-bottom:1px solid #E6F1FB;padding-bottom:6px;text-transform:uppercase;letter-spacing:0.05em">${title}</h2>`;
      }
      return `<p style="font-family:sans-serif;font-size:13px;line-height:1.7;color:#1a1a18;margin:0 0 10px">${trimmed}</p>`;
    })
    .join('');

  const html = `
<!DOCTYPE html>
<html lang="pl">
<head><meta charset="UTF-8"><title>Raport KSC/NIS2</title></head>
<body style="background:#F7F6F2;padding:32px 16px;margin:0">
  <div style="max-width:680px;margin:0 auto;background:white;border-radius:10px;overflow:hidden;border:1px solid #D3D1C7">
    <div style="background:#0C447C;padding:24px 28px">
      <div style="color:rgba(255,255,255,0.7);font-size:11px;font-family:sans-serif;margin-bottom:8px">KSC / NIS2 · Ustawa z 3 kwietnia 2026 r.</div>
      <h1 style="color:white;font-size:18px;font-family:sans-serif;margin:0 0 4px">Raport zgodności KSC/NIS2</h1>
      <div style="color:rgba(255,255,255,0.8);font-size:13px;font-family:sans-serif">${firma || 'Analiza luk'}</div>
    </div>
    <div style="padding:28px">
      ${htmlBody}
    </div>
    <div style="padding:16px 28px;background:#F7F6F2;border-top:1px solid #D3D1C7;font-size:11px;color:#888780;font-family:sans-serif;line-height:1.6">
      Raport wygenerowany przez <a href="https://www.nis2-audytor.pl" style="color:#185FA5">nis2-audytor.pl</a>. 
      Dokument ma charakter informacyjno-analityczny i nie stanowi porady prawnej.
    </div>
  </div>
</body>
</html>`;

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Audytor NIS2 <raport@nis2-audytor.pl>',
        to: [email],
        subject: `Raport KSC/NIS2 — ${firma || 'analiza gotowości'}`,
        html,
        reply_to: 'mateusz.sidor@interia.eu',
      }),
    });

    if (!r.ok) {
      const err = await r.json();
      throw new Error(err.message || `Resend błąd: ${r.status}`);
    }

    console.log(`[send-report] Raport wysłany na ${email}`);
    res.json({ success: true });

  } catch (err) {
    console.error('[send-report]', err.message);
    // Nie blokuj użytkownika — raport i tak widzi na ekranie
    res.json({ success: false, warning: 'Raport wygenerowany, ale nie udało się wysłać e-maila.' });
  }
});

// ── health check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', version: '4.0.0' }));

app.listen(PORT, () => console.log(`NIS2 Audytor v4 działa na porcie ${PORT}`));
