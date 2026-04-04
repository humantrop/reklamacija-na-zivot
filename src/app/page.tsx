import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <div className="max-w-2xl">
        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
          <span className="text-accent">Reklamacija</span> na Život
        </h1>
        <p className="mt-6 text-lg leading-8 text-muted">
          Ponekad ti samo treba neko da te sasluša. Ovde možeš anonimno da
          razgovaraš sa potpunim strancem — bez imena, bez osude, bez tragova.
          Požali se, ispričaj se, ili samo ćaskaj.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link
            href="/register"
            className="rounded-lg bg-accent px-6 py-3 text-base font-semibold text-white shadow-lg shadow-accent/25 hover:bg-accent/80 transition-colors"
          >
            Započni razgovor
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-surface-light px-6 py-3 text-base font-semibold text-muted hover:text-foreground hover:border-muted transition-colors"
          >
            Već imam nalog
          </Link>
        </div>
      </div>

      <div className="mt-20 grid max-w-3xl grid-cols-1 gap-8 sm:grid-cols-3">
        <div className="rounded-xl bg-surface p-6 text-left">
          <div className="text-2xl mb-3">🎭</div>
          <h3 className="font-semibold text-foreground">Potpuna anonimnost</h3>
          <p className="mt-2 text-sm text-muted">
            Niko ne zna ko si. Tvoj identitet je potpuno skriven od sagovornika.
          </p>
        </div>
        <div className="rounded-xl bg-surface p-6 text-left">
          <div className="text-2xl mb-3">💬</div>
          <h3 className="font-semibold text-foreground">Instant razgovor</h3>
          <p className="mt-2 text-sm text-muted">
            Jedan klik i spojen si sa nekim ko je spreman da te sasluša.
          </p>
        </div>
        <div className="rounded-xl bg-surface p-6 text-left">
          <div className="text-2xl mb-3">🔒</div>
          <h3 className="font-semibold text-foreground">Poruke nestaju</h3>
          <p className="mt-2 text-sm text-muted">
            Kad razgovor završi, poruke se brišu. Nema tragova, nema istorije.
          </p>
        </div>
      </div>
    </div>
  );
}
