// knowledge-base.js
// Zweryfikowana baza wiedzy prawnej dla audytora NIS2/KSC
// Źródła: Ustawa KSC (Dz.U. 2026 poz. 252), Dyrektywa NIS2 (2022/2555), FAQ MC kwiecień 2026
// UWAGA: Przed wdrożeniem komercyjnym zweryfikuj każdy fragment z tekstem źródłowym

const KNOWLEDGE_BASE = `
=============================================================
ZWERYFIKOWANA BAZA WIEDZY PRAWNEJ — UŻYJ JAKO JEDYNEGO ŹRÓDŁA
Wszystkie informacje poniżej są weryfikowane. Nie dodawaj informacji
spoza tej bazy. Jeśli baza nie zawiera odpowiedzi na jakieś pytanie,
napisz "wymaga weryfikacji przez radcę prawnego".
=============================================================

== SEKCJA 1: DEFINICJE I KATEGORIE PODMIOTÓW ==

PODMIOT KLUCZOWY (ESSENTIAL ENTITY):
- Podmioty z ZAŁĄCZNIKA NR 1 do UKSC, które są dużymi przedsiębiorcami
- Duży przedsiębiorca: ≥ 250 pracowników LUB (obrót > 50 mln EUR ORAZ suma bilansowa > 43 mln EUR)
- Sektor energetyki, transportu, bankowości, ochrony zdrowia, infrastruktury cyfrowej, administracji publicznej, przestrzeni kosmicznej
- Nadzór PROAKTYWNY — organ może kontrolować bez incydentu
- Audyt bezpieczeństwa: OBOWIĄZKOWO co 3 lata + na żądanie organu
- Kary: do 10 mln EUR LUB 2% całkowitego rocznego obrotu (kwota wyższa; min. 20 000 zł)

PODMIOT WAŻNY (IMPORTANT ENTITY):
- Podmioty z ZAŁĄCZNIKA NR 1 (średni przedsiębiorcy) LUB ZAŁĄCZNIKA NR 2 (średni i duzi)
- Załącznik nr 2 obejmuje m.in.: usługi pocztowe i kurierskie, gospodarkę odpadami, PRODUKCJĘ I DYSTRYBUCJĘ ŻYWNOŚCI, produkcję chemikaliów, usługi cyfrowe
- Nadzór REAKTYWNY — organ weryfikuje gdy pojawi się problem lub incydent
- Audyt bezpieczeństwa: WYŁĄCZNIE na żądanie organu (brak obowiązkowego cyklu regularnego!)
- Kary: do 7 mln EUR LUB 1,4% całkowitego rocznego obrotu (kwota wyższa; min. 15 000 zł)
- Odpowiedzialność kierownika podmiotu ważnego: kara do 100 000 zł (nie % wynagrodzenia jak dla podmiotów kluczowych)

WAŻNE ROZRÓŻNIENIE AUDYTU:
- PODMIOT KLUCZOWY: audyt co 3 lata obowiązkowo, pierwsze podmioty które były OUK: do maja 2027; nowe podmioty kluczowe: do 3 kwietnia 2028
- PODMIOT WAŻNY: BRAK obowiązkowego regularnego audytu — tylko na żądanie organu właściwego
- Sektor spożywczy (Załącznik nr 2) = PODMIOT WAŻNY = brak obowiązkowego cyklu audytowego

== SEKCJA 2: DEFINICJA MŚP I PROGI KWALIFIKACJI ==

Podstawa prawna: Rozporządzenie Komisji (UE) nr 651/2014, Załącznik I

MIKROPRZEDSIĘBIORSTWO: < 10 pracowników ORAZ (obrót ≤ 2 mln EUR LUB suma bilansowa ≤ 2 mln EUR)

MAŁE PRZEDSIĘBIORSTWO: < 50 pracowników ORAZ (obrót ≤ 10 mln EUR LUB suma bilansowa ≤ 10 mln EUR)
→ Małe przedsiębiorstwo CO DO ZASADY nie podlega UKSC (chyba że przepis szczególny)

ŚREDNIE PRZEDSIĘBIORSTWO: < 250 pracowników ORAZ (obrót ≤ 50 mln EUR LUB suma bilansowa ≤ 43 mln EUR)
→ Średnie przedsiębiorstwo z właściwego sektora = podmiot ważny

DUŻE PRZEDSIĘBIORSTWO: ≥ 250 pracowników LUB (obrót > 50 mln EUR I suma bilansowa > 43 mln EUR)
→ Duże przedsiębiorstwo z Załącznika 1 = podmiot kluczowy; z Załącznika 2 = podmiot ważny

LOGIKA KWALIFIKACJI (zastosuj dokładnie):
Firma WYCHODZI poza małe przedsiębiorstwo (może podlegać UKSC) gdy:
  [A] zatrudnienie ≥ 50 pracowników, LUB
  [B] obrót > 10 mln EUR ORAZ suma bilansowa > 10 mln EUR (oba jednocześnie!)
  
UWAGA: samo przekroczenie obrotu przy sumie bilansowej ≤ 10 mln EUR NIE wypycha firmy poza próg "małego".
Jeśli brak danych o sumie bilansowej — napisz że wymaga weryfikacji.

GRUPY KAPITAŁOWE (FAQ MC, pkt 1.x):
Przy ustalaniu wielkości przedsiębiorstwa sumuje się dane z przedsiębiorstwami powiązanymi i partnerskimi zgodnie z Rozp. 651/2014 art. 3-6. Firma należąca do grupy może przekroczyć progi mimo że samodzielnie jest mała.

== SEKCJA 3: HARMONOGRAM OBOWIĄZKÓW ==

3 KWIETNIA 2026: Wejście w życie nowelizacji UKSC
7 MAJA 2026: Otwarcie aplikacji wykaz-ksc.gov.pl dla samorejestracji prywatnych firm
12 CZERWCA 2026: Uruchomienie Systemu S46 dla nowych podmiotów (raportowanie incydentów)
3 PAŹDZIERNIKA 2026: Deadline samorejestracji w Wykazie KSC (dla podmiotów istniejących od 3 kwi 2026)
3 KWIETNIA 2027: Deadline wdrożenia SZBI i wszystkich obowiązków art. 21 NIS2
3 KWIETNIA 2028: Deadline pierwszego audytu dla podmiotów KLUCZOWYCH (nie ważnych!)

REJESTRACJA (FAQ MC):
- Platforma: wykaz-ksc.gov.pl (osobna aplikacja od S46)
- Wymagany: podpis elektroniczny (kwalifikowany lub zaufany profil ePUAP)
- Status deklaratoryjny: firma podlega ustawie od spełnienia przesłanek, nie od wpisu
- Brak wniosku = kara administracyjna (min. 15 000 zł dla podmiotów ważnych)

== SEKCJA 4: WYMAGANIA BEZPIECZEŃSTWA (ART. 21 DYREKTYWY NIS2) ==

Podmioty ważne i kluczowe muszą wdrożyć środki proporcjonalne do ryzyka:

a) POLITYKI BEZPIECZEŃSTWA I ANALIZY RYZYKA:
   - Pisemna polityka bezpieczeństwa systemów informacyjnych
   - Regularna analiza ryzyka (metodologia oparta na normach, np. ISO 27005)
   - Rejestr aktywów informacyjnych jako podstawa analizy

b) ZARZĄDZANIE INCYDENTAMI:
   - Procedura wykrywania, klasyfikacji i zgłaszania incydentów
   - Wczesne ostrzeżenie do CSIRT: do 24 godzin od wykrycia
   - Zgłoszenie szczegółowe: do 72 godzin od wykrycia
   - Sprawozdanie końcowe: do 1 miesiąca od zgłoszenia
   - System S46 (od 12 czerwca 2026): platforma do elektronicznego raportowania

c) CIĄGŁOŚĆ DZIAŁANIA (BCP/DRP):
   - Plan ciągłości działania i odtwarzania po awarii
   - Procedura zarządzania kopiami zapasowymi z regularnymi testami odtwarzania
   - Zarządzanie kryzysowe

d) BEZPIECZEŃSTWO ŁAŃCUCHA DOSTAW:
   - Ocena ryzyka dostawców ICT i oprogramowania
   - Klauzule bezpieczeństwa w umowach z dostawcami

e) BEZPIECZEŃSTWO W TRAKCIE UTRZYMANIA SIECI:
   - Zarządzanie podatnościami i aktualizacjami (patch management)
   - Segmentacja sieci IT/OT
   - Monitoring logów i alertów bezpieczeństwa

f) POLITYKI I PROCEDURY OCENY SKUTECZNOŚCI:
   - Szkolenia dla pracowników i kadry zarządzającej
   - Wyznaczenie osoby odpowiedzialnej za cyberbezpieczeństwo

g) KRYPTOGRAFIA I SZYFROWANIE:
   - Szyfrowanie danych w spoczynku i podczas transmisji
   - Stosowanie bezpiecznych protokołów (HTTPS, TLS 1.2+)

h) ZARZĄDZANIE DOSTĘPEM:
   - Uwierzytelnianie wieloskładnikowe (MFA) dla dostępu zdalnego i systemów krytycznych
   - Zasada minimalnych uprawnień

== SEKCJA 5: SEKTOR ŻYWNOŚCI — SZCZEGÓŁY ==

Podstawa prawna: Załącznik nr 2 do UKSC (Sekcja IX)
Objęte podmioty: przedsiębiorcy prowadzący działalność w zakresie:
- Produkcji żywności (przetwórstwo mięsne, mleczarstwo, piekarstwo przemysłowe, itp.)
- Przetwórstwa żywności
- Hurtowej dystrybucji żywności

Kryterium wielkości dla sektora spożywczego:
- Podmiot ważny = co najmniej ŚREDNI przedsiębiorca (≥ 50 pracowników LUB obrót > 10 mln EUR + suma bilansowa > 10 mln EUR)
- Próg działa łącznie z kryterium sektorowym

Specyficzne ryzyka dla zakładów spożywczych:
- Ataki ransomware na systemy ERP i MES mogą zatrzymać linię produkcyjną
- Kompromitacja systemu HACCP może zagrozić bezpieczeństwu żywności
- Wyciek receptur i danych klientów (hurtowni/sieci)
- Awaria systemu chłodniczego spowodowana cyberatakiem na SCADA

== SEKCJA 6: FAQ MINISTERSTWA CYFRYZACJI — KLUCZOWE ODPOWIEDZI ==

WAŻNE: FAQ MC ma charakter pomocniczy i interpretacyjny. Nie jest wiążącym aktem prawnym.
Każdy podmiot samodzielnie ocenia swój status i odpowiada za tę ocenę.

FAQ 1.1 — Samoidentyfikacja:
"Podmiot musi samodzielnie ocenić, czy spełnia kryteria podmiotu kluczowego lub ważnego. Ocena powinna uwzględniać faktyczną działalność, kody PKD oraz dokumenty urzędowe (koncesje, zezwolenia)."

FAQ 1.2 — Deklaratoryjność wpisu:
"Wpis do wykazu ma charakter deklaratoryjny — status podmiotu wynika z samego spełnienia ustawowych przesłanek. Brak złożenia wniosku o wpis nie zwalnia z obowiązków i może skutkować sankcją."

FAQ 1.3 — Grupy kapitałowe:
"Przy ustalaniu wielkości przedsiębiorstwa uwzględnia się dane łączne z przedsiębiorstwami partnerskimi i powiązanymi zgodnie z Rozp. 651/2014."

FAQ 2.1 — System S46:
"System S46 służy do realizacji obowiązków ustawowych, w szczególności raportowania incydentów. Dostępny dla nowych podmiotów od 12 czerwca 2026."

FAQ 3.1 — Audyt podmiotów ważnych:
"Podmioty ważne nie mają obowiązku regularnego cyklicznego audytu. Audyt przeprowadzany jest wyłącznie na żądanie organu właściwego ds. cyberbezpieczeństwa."

FAQ 4.1 — Odpowiedzialność zarządu:
"Kierownik podmiotu zatwierdza środki zarządzania ryzykiem i odpowiada za ich wdrożenie. Może ponosić odpowiedzialność finansową za naruszenia obowiązków ustawowych."

== SEKCJA 7: SZABLONY OCENY PILNOŚCI ==

LUKA KRYTYCZNA: Naruszenie wprost sankcjonowane karą lub termin w ciągu < 3 miesięcy
Przykłady: brak rejestracji w wykazie KSC, brak procedury zgłaszania incydentów, brak MFA

LUKA WYSOKA: Wymóg obowiązkowy z deadlinem 3 kwi 2027, znaczące ryzyko operacyjne
Przykłady: brak PBI, brak analizy ryzyka, brak BCP, brak backupu z testami

LUKA ŚREDNIA: Wymóg obowiązkowy ale mniejsze bezpośrednie ryzyko finansowe lub operacyjne
Przykłady: brak weryfikacji dostawców, brak klauzul w umowach, brak monitoringu logów
=============================================================
KONIEC BAZY WIEDZY — nie generuj informacji spoza tej bazy
=============================================================
`;

module.exports = { KNOWLEDGE_BASE };
