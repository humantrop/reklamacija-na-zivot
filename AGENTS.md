Ready for review
Select text to add comments on the plan
Plan: 5 novih feature-ova za reklamacija-na-zivot
Context
Aplikacija je live na Railway-u sa osnovnim funkcionalnostima (auth, 1-on-1 anonimni chat, emoji picker). Korisnik želi 5 poboljšanja: redizajn sa novim fontom, grupni chat, admin statistika, korisničke značke/achievements, i kategorije žalbi za pametnije sparivanje.

Feature 1: Redizajn i font
Problem
Trenutni dizajn koristi Geist font i basic Tailwind stilove. Treba moderniji, topliji izgled.

Plan
Font: Zameniti Geist sa Space Grotesk — tech/brutalist vibe, upečatljiv i drugačiji. Jedan font za sve (naslovi bold, tekst regular)
Landing stranica: Dodati gradient pozadinu, veće hero sekcija, animirane kartice, subtilne pozadinske oblike (blur circles)
Kartice i dugmad: Glassmorphism efekat (backdrop-blur + semi-transparent pozadine), bolji shadow-i
Chat UI: Lepši message bubbles sa gradijentom, avatar placeholder sa inicijalima pseudonima
Navbar: Sticky sa blur efektom, logo sa ikonom
Fajlovi za izmenu
src/app/layout.tsx — zamena fontova
src/app/globals.css — novi stilovi, gradijenti, animacije
src/app/page.tsx — redizajn landing-a
src/app/dashboard/page.tsx — lepši dashboard
src/components/Navbar.tsx — poboljšan navbar
src/components/ChatWindow.tsx — lepši message bubbles
src/components/ChatInput.tsx — poboljšan input
Feature 2: Grupni random chat
Problem
Trenutno postoji samo 1-on-1 chat. Korisnik želi opciju za grupni razgovor sa više stranaca.

Plan
Na dashboardu dodati dva dugmeta: "Nađi sagovornika" (1-on-1) i "Grupni razgovor" (3-5 ljudi)
Kreirati poseban queue za grupni chat na serveru
Grupni chat čeka dok se ne sakupi minimum 3 korisnika (max 5), ili timeout od 30s pa kreće sa koliko ima (min 2)
Svaki učesnik dobija unikatan pseudonim i boju (5 različitih boja za lakše razlikovanje)
Chat UI prikazuje pseudonim i boju za svaku poruku
Fajlovi za izmenu
src/server/socket.ts — novi find-group-match event, grupni queue, grupne sobe
src/app/chat/page.tsx — podrška za više od 2 učesnika, parametar za tip chata
src/app/dashboard/page.tsx — dva dugmeta umesto jednog
src/components/ChatWindow.tsx — prikaz boja za svakog učesnika
Nova logika u socket.ts
groupQueue: WaitingUser[] — čekanje za grupu
Kad queue dostigne 3+ korisnika, formira grupu
Timeout mehanizam (30s) — formira grupu sa koliko god ima
Svaka grupa dobija sobu sa unikatnim pseudonimima
Feature 3: Admin statistika
Problem
Ne postoji nikakav uvid u korišćenje aplikacije.

Plan
Dodati role polje na User model (USER | ADMIN)
Kreirati /admin stranicu zaštićenu role-based middleware-om
Server prati statistiku u memoriji (+ periodično čuva u bazu):
Ukupan broj registrovanih korisnika (iz baze)
Broj online korisnika (iz Socket.io)
Broj aktivnih chatova (iz activeRooms)
Ukupan broj uspešno povezanih chatova (kumulativno, čuva se u bazi)
Broj korisnika koji čekaju match
Dashboard sa karticama i brojevima u realnom vremenu (Socket.io za live update)
Izmene u bazi (Prisma schema)
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  role      Role     @default(USER)
  createdAt DateTime @default(now())
}

model Stats {
  id                String @id @default("global")
  totalChatsCreated Int    @default(0)
  totalMessages     Int    @default(0)
  updatedAt         DateTime @updatedAt
}

enum Role {
  USER
  ADMIN
}
Fajlovi za kreiranje/izmenu
prisma/schema.prisma — dodati Role enum, Stats model
src/app/admin/page.tsx — NOV admin dashboard
src/app/api/admin/stats/route.ts — NOV API za statistiku
src/server/socket.ts — brojanje chatova i poruka
src/proxy.ts — zaštita /admin rute
Feature 4: Korisničke značke (Achievements)
Problem
Nema gamifikacije ni motivacije za korišćenje.

Plan
Pratiti broj uspešnih chatova po korisniku u bazi
Značke na osnovu broja chatova:
🌱 Početnik — 1 chat
💬 Društvenjak — 5 chatova
🌟 Veteranov — 15 chatova
🏆 Legenda — 50 chatova
👑 Vladar životnih reklamacija — 100 chatova
Na dashboardu prikazati trenutnu značku i progress bar do sledeće
Popup/toast notifikacija kad korisnik osvoji novu značku
Izmene u bazi
model User {
  ...existing fields...
  totalChats Int @default(0)  // increment after each completed chat
}
Fajlovi za kreiranje/izmenu
prisma/schema.prisma — dodati totalChats na User
src/lib/achievements.ts — NOV definicije znački i logika
src/app/dashboard/page.tsx — prikaz značke i progress bara
src/server/socket.ts — increment totalChats kad chat završi
src/app/api/user/stats/route.ts — NOV API za korisnikovu statistiku
src/components/AchievementToast.tsx — NOV notifikacija za novu značku
Feature 5: Kategorije žalbi (pametno sparivanje)
Problem
Korisnici se sparuju potpuno nasumično. Želimo opciju da se spoje sa nekim ko ima sličan problem.

Plan
Kategorije: Šef, Žena, Muž, Dete, Posao, Porodica, Zdravlje, Novac, Prijatelji, Ostalo
Na dashboardu toggle: "Sparivanje po kategoriji" (on/off)
Kad je uključeno, pojavljuju se kartice sa kategorijama za izbor
Matchmaking logika:
Ako korisnik izabere kategoriju → ide u category-specific queue
Ako niko sa istom kategorijom ne čeka duže od 20s → fallback na general queue
Ako korisnik ne izabere kategoriju → ide u general queue (kao do sad)
U chat headeru se prikazuje kategorija ako su oboje birali
Izmene u matchmaking (socket.ts)
categoryQueues: Map<string, WaitingUser[]> — queue po kategoriji
Timeout mehanizam: 20s čekanje u category queue, potom prebacivanje u general queue
find-match event prima opcioni category parametar
Fajlovi za kreiranje/izmenu
src/lib/categories.ts — NOV lista kategorija sa ikonama i bojama
src/app/dashboard/page.tsx — toggle + kartice kategorija
src/server/socket.ts — category queues i fallback logika
src/app/chat/page.tsx — slanje kategorije pri match-u, prikaz u headeru
src/components/CategoryPicker.tsx — NOV UI za izbor kategorije
Redosled implementacije
Feature 1: Redizajn — prvo, jer sve ostalo gradimo na novom dizajnu
Feature 5: Kategorije žalbi — menja matchmaking koji je core funkcionalnost
Feature 2: Grupni chat — proširenje matchmaking-a
Feature 4: Achievements — zahteva DB migraciju i UI na dashboardu
Feature 3: Admin statistika — poslednje jer zavisi od svega ostalog
Verifikacija
Redizajn: Vizuelna provera svih stranica
Grupni chat: Otvoriti 3+ taba, svi kliknu grupni chat, proveri da se svi spoje
Admin: Kreirati admin usera u bazi, proveriti /admin stranicu
Achievements: Napraviti par chatova, proveriti da se značka pojavi
Kategorije: Dva korisnika biraju istu kategoriju → spareni; jedan bira drugu → fallback na random posle 20s