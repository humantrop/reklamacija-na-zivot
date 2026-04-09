import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="flex flex-1 justify-center px-6 py-12">
      <div className="w-full max-w-3xl">
        <Link href="/" className="text-sm text-muted hover:text-foreground transition-colors mb-8 inline-block">
          ← Nazad na početnu
        </Link>

        <h1 className="text-3xl font-bold mb-2">Uslovi korišćenja</h1>
        <p className="text-muted text-sm mb-10">Poslednje ažuriranje: april 2026.</p>

        <div className="space-y-8 text-muted leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">1. Prihvatanje uslova</h2>
            <p>
              Korišćenjem aplikacije Sve će biti OK prihvataš ove Uslove korišćenja
              u celosti. Ako se ne slažeš sa bilo kojim delom ovih uslova, nemoj koristiti
              aplikaciju.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">2. Opis usluge</h2>
            <p>
              Sve će biti OK je besplatna anonimna chat platforma koja povezuje
              korisnike sa nasumično odabranim sagovornicima. Aplikacija je namenjena za
              neobavezne razgovore i podršku — nije zamena za profesionalnu psihološku
              ili medicinsku pomoć.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">3. Starosno ograničenje</h2>
            <p>
              Aplikacija je namenjena isključivo osobama starijim od <span className="text-foreground font-semibold">18 godina</span>.
              Registracijom potvrđuješ da imaš 18 ili više godina. Zadržavamo pravo da
              uklonimo naloge za koje utvrdimo da pripadaju maloletnim licima.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">4. Pravila ponašanja</h2>
            <p className="mb-3">Korišćenjem aplikacije se obavezuješ da nećeš:</p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>Slati uvredljiv, preteći, rasistički ili diskriminatorski sadržaj</li>
              <li>Uznemiravati, maltretirati ili zastrašivati druge korisnike</li>
              <li>Deliti eksplicitan seksualni sadržaj ili pornografiju</li>
              <li>Slati neželjene reklame, spam ili phishing linkove</li>
              <li>Pokušavati da otkriješ identitet drugih korisnika</li>
              <li>Tražiti ili deliti lične podatke (ime, adresa, telefon, društvene mreže)</li>
              <li>Koristiti aplikaciju u nezakonite svrhe</li>
              <li>Podsticati samopovređivanje ili nasilje</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">5. Zaštita ličnih podataka</h2>
            <p>
              Svesno deljenje ličnih podataka u razgovorima je na sopstvenu odgovornost.
              Iako se poruke ne čuvaju nakon završetka razgovora, ne možemo garantovati
              šta će drugi korisnik uraditi sa informacijama koje mu pošalješ tokom sesije.{" "}
              <span className="text-foreground font-semibold">
                Preporučujemo da nikad ne deliš lične podatke.
              </span>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">6. Poruke i privatnost</h2>
            <p>
              Sve poruke su efemerne — postoje samo dok traje razgovor. Kada sesija završi
              (bilo da korisnik napusti chat ili se prekine veza), poruke se trajno brišu
              iz memorije servera. Ne čuvamo, ne arhiviramo i ne čitamo sadržaj razgovora.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">7. Odricanje od odgovornosti</h2>
            <p>
              Aplikacija se pruža &ldquo;kao što jeste&rdquo; (as-is). Ne garantujemo neprekidno
              funkcionisanje, niti snosimo odgovornost za sadržaj koji korisnici razmenjuju.
              Korisnici su sami odgovorni za svoje ponašanje i poruke. Ova aplikacija
              nije zamena za profesionalnu pomoć — ako ti je potrebna podrška, obrati se
              stručnjaku.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">8. Ukidanje naloga</h2>
            <p>
              Zadržavamo pravo da ukidamo ili suspendujemo naloge korisnika koji krše
              ove Uslove korišćenja, bez prethodnog obaveštenja.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">9. Besplatno korišćenje</h2>
            <p>
              Aplikacija je trenutno besplatna. Zadržavamo pravo da u budućnosti uvedemo
              plaćene funkcionalnosti, o čemu ćemo blagovremeno obavestiti korisnike.
              Osnovne funkcionalnosti će ostati besplatne.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">10. Izmene uslova</h2>
            <p>
              Zadržavamo pravo da izmenimo ove Uslove korišćenja. O značajnim promenama
              ćemo obavestiti korisnike putem obaveštenja u aplikaciji. Nastavak korišćenja
              nakon izmena podrazumeva prihvatanje novih uslova.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">11. Kontakt</h2>
            <p>
              Za sva pitanja u vezi sa ovim uslovima, obrati se na:{" "}
              <span className="text-accent font-medium">reklamacija.na.zivot@gmail.com</span>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
