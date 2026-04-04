# Reklamacija na Život 🎭

Anonimna chat aplikacija gde se možeš požaliti potpunom strancu — bez imena, bez osude, bez tragova.

## Kako radi

1. Registruj se sa email-om i lozinkom (tvoj identitet je potpuno skriven od sagovornika)
2. Klikni "Nađi sagovornika" da budeš spojen sa nasumičnim strancem
3. Razgovaraj anonimno — dobijaš random pseudonim (npr. "Tihi Vulkan", "Mudri Pingvin")
4. Kad završiš, poruke se brišu — nema tragova

## Tech Stack

- **Next.js 16** (App Router)
- **Socket.io** (real-time WebSocket chat)
- **NextAuth.js** (autentifikacija sa email/lozinka)
- **PostgreSQL** + **Prisma ORM**
- **Tailwind CSS** (dark tema)
- **emoji-picker-react** (emoji podrška)

## Pokretanje

### Preduslov

- Node.js 20+
- PostgreSQL baza podataka

### Instalacija

```bash
# Kloniraj repo
git clone https://github.com/your-username/reklamacija-na-zivot.git
cd reklamacija-na-zivot

# Instaliraj zavisnosti
npm install

# Kopiraj .env.example u .env i podesi DATABASE_URL i NEXTAUTH_SECRET
cp .env.example .env

# Pokreni migraciju baze
npx prisma migrate dev

# Generiši Prisma klijent
npx prisma generate

# Pokreni dev server
npm run dev
```

Aplikacija će biti dostupna na [http://localhost:3000](http://localhost:3000).

### Testiranje chata

Otvori dva različita browser taba (ili koristi incognito mod), registruj dva naloga, i klikni "Nađi sagovornika" na oba — bićeš spojen!

## Struktura projekta

```
src/
├── app/           # Next.js App Router stranice
│   ├── api/       # API rute (auth, register)
│   ├── chat/      # Chat interfejs
│   ├── dashboard/ # Početna stranica nakon logina
│   ├── login/     # Login forma
│   └── register/  # Registracija forma
├── components/    # React komponente (Navbar, ChatWindow, ChatInput...)
├── lib/           # Utility fajlovi (prisma, auth, pseudonimi)
└── server/        # Socket.io server logika
```

## Licenca

MIT
