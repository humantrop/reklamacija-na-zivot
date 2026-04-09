import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="flex flex-1 justify-center px-6 py-12">
      <div className="w-full max-w-3xl">
        <Link href="/" className="text-sm text-muted hover:text-foreground transition-colors mb-8 inline-block">
          ← Nazad na početnu
        </Link>

        <h1 className="text-3xl font-bold mb-2">Politika privatnosti</h1>
        <p className="text-muted text-sm mb-10">Poslednje ažuriranje: april 2026.</p>

        <div className="space-y-8 text-muted leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">1. Uvod</h2>
            <p>
              Sve će biti OK (&ldquo;mi&rdquo;, &ldquo;naša aplikacija&rdquo;) je anonimna chat platforma
              koja omogućava korisnicima da razgovaraju sa nasumično odabranim sagovornicima.
              Ova Politika privatnosti objašnjava koje podatke prikupljamo, kako ih koristimo
              i kako ih štitimo.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">2. Podaci koje prikupljamo</h2>
            <p className="mb-3">Prikupljamo minimalne podatke neophodne za funkcionisanje aplikacije:</p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>
                <span className="text-foreground font-medium">Email adresa</span> — koristi se
                isključivo za prijavljivanje na nalog. Nikad se ne prikazuje drugim korisnicima.
              </li>
              <li>
                <span className="text-foreground font-medium">Lozinka</span> — čuva se u
                šifrovanom (hash) obliku. Ni mi nemamo pristup tvojoj lozinki u čitljivom formatu.
              </li>
              <li>
                <span className="text-foreground font-medium">Statistika korišćenja</span> — broj
                obavljenih razgovora (za sistem znački). Ne čuvamo sadržaj razgovora.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">3. Podaci koje NE prikupljamo</h2>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>
                <span className="text-foreground font-medium">Poruke iz razgovora</span> — poruke
                postoje samo u memoriji servera dok traje sesija. Kada razgovor završi, poruke se
                trajno brišu i ne mogu se povratiti.
              </li>
              <li>Ne prikupljamo ime, prezime, adresu, telefon ni bilo koje druge lične podatke.</li>
              <li>Ne koristimo kolačiće za praćenje niti analitičke alate trećih strana.</li>
              <li>Ne delimo tvoje podatke sa trećim stranama.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">4. Anonimnost</h2>
            <p>
              Tvoj identitet je potpuno skriven od drugih korisnika. U razgovoru se korisnicima
              dodeljuju nasumično generisani pseudonimi (npr. &ldquo;Tihi Vulkan&rdquo;). Drugi korisnici
              ne mogu videti tvoj email, IP adresu niti bilo koji podatak koji te identifikuje.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">5. Bezbednost podataka</h2>
            <p>
              Koristimo industrijske standarde za zaštitu podataka, uključujući šifrovanje
              lozinki (bcrypt), HTTPS enkripciju u prenosu i sigurne sesije (JWT).
              Baza podataka je zaštićena i dostupna samo autorizovanim sistemima.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">6. Starosno ograničenje</h2>
            <p>
              Ova aplikacija je namenjena isključivo osobama starijim od 18 godina.
              Ne prikupljamo svesno podatke od maloletnih lica. Ako saznamo da se
              maloletno lice registrovalo, nalog će biti uklonjen.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">7. Brisanje naloga</h2>
            <p>
              Možeš zatražiti brisanje svog naloga i svih povezanih podataka u bilo kom
              trenutku slanjem zahteva na email adresu navedenu u kontakt sekciji.
              Brisanje je trajno i nepovratno.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">8. Izmene ove politike</h2>
            <p>
              Zadržavamo pravo da ažuriramo ovu Politiku privatnosti. O značajnim promenama
              ćemo obavestiti korisnike putem obaveštenja u aplikaciji. Nastavak korišćenja
              aplikacije nakon izmena podrazumeva prihvatanje novih uslova.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">9. Kontakt</h2>
            <p>
              Za sva pitanja u vezi sa privatnošću, obrati se na:{" "}
              <span className="text-accent font-medium">reklamacija.na.zivot@gmail.com</span>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
