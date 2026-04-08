import Link from "next/link";
import { EyeOff, MessageCircle, Lock, Zap } from "lucide-react";

export default function Home() {
  return (
    <div className="relative flex flex-1 flex-col items-center justify-center px-6 text-center overflow-hidden">
      {/* Background orbs */}
      <div className="bg-orb w-96 h-96 bg-accent top-[-10%] left-[-10%]" />
      <div className="bg-orb w-80 h-80 bg-accent-blue bottom-[-5%] right-[-5%]" />
      <div className="bg-orb w-64 h-64 bg-accent-pink top-[40%] right-[20%]" />

      <div className="relative max-w-2xl z-10">
        <div className="inline-block mb-6 rounded-full glass-card px-4 py-1.5 text-xs font-medium text-muted tracking-wider uppercase">
          Anonimno &bull; Sigurno &bull; Bez tragova
        </div>

        <h1 className="text-5xl font-bold tracking-tight sm:text-7xl leading-[1.1]">
          <span className="gradient-text">Reklamacija</span>
          <br />
          na Život
        </h1>

        <p className="mt-6 text-lg leading-8 text-muted max-w-lg mx-auto">
          Ponekad ti samo treba neko da te sasluša. Ovde možeš anonimno da
          razgovaraš sa potpunim strancem — bez imena, bez osude.
        </p>

        <div className="mt-10 flex flex-col items-center gap-4">
          <Link
            href="/dashboard?guest=1"
            className="glow-button relative rounded-xl bg-accent px-10 py-4 text-lg font-bold text-white hover:bg-accent-hover transition-all duration-300 hover:scale-105 inline-flex items-center gap-2"
          >
            <Zap className="w-5 h-5" /> Pričaj odmah
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/register"
              className="glass-card rounded-xl px-6 py-2.5 text-sm font-medium text-muted hover:text-foreground transition-all duration-300 hover:border-accent/30"
            >
              Napravi nalog
            </Link>
            <span className="text-muted/30">|</span>
            <Link
              href="/login"
              className="text-sm font-medium text-muted hover:text-foreground transition-colors"
            >
              Prijavi se
            </Link>
          </div>
          <p className="text-xs text-muted/60 mt-1">Nalog ti daje značke, statistiku i zaštitu od zloupotrebe</p>
        </div>
      </div>

      <div className="relative z-10 mt-24 grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="glass-card rounded-2xl p-6 text-left transition-all duration-300 hover:border-accent/30 hover:-translate-y-1">
          <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
            <EyeOff className="w-5 h-5 text-accent" />
          </div>
          <h3 className="font-semibold text-foreground">Potpuna anonimnost</h3>
          <p className="mt-2 text-sm text-muted leading-relaxed">
            Niko ne zna ko si. Tvoj identitet je potpuno skriven od sagovornika.
          </p>
        </div>
        <div className="glass-card rounded-2xl p-6 text-left transition-all duration-300 hover:border-accent-blue/30 hover:-translate-y-1">
          <div className="w-10 h-10 rounded-lg bg-accent-blue/10 flex items-center justify-center mb-4">
            <MessageCircle className="w-5 h-5 text-accent-blue" />
          </div>
          <h3 className="font-semibold text-foreground">Instant razgovor</h3>
          <p className="mt-2 text-sm text-muted leading-relaxed">
            Jedan klik i spojen si sa nekim ko je spreman da te sasluša.
          </p>
        </div>
        <div className="glass-card rounded-2xl p-6 text-left transition-all duration-300 hover:border-accent-pink/30 hover:-translate-y-1">
          <div className="w-10 h-10 rounded-lg bg-accent-pink/10 flex items-center justify-center mb-4">
            <Lock className="w-5 h-5 text-accent-pink" />
          </div>
          <h3 className="font-semibold text-foreground">Poruke nestaju</h3>
          <p className="mt-2 text-sm text-muted leading-relaxed">
            Kad razgovor završi, poruke se brišu. Nema tragova, nema istorije.
          </p>
        </div>
      </div>

      {/* Footer links */}
      <div className="relative z-10 mt-16 mb-8 flex items-center gap-4 text-xs text-muted">
        <Link href="/uslovi" className="hover:text-foreground transition-colors">
          Uslovi korišćenja
        </Link>
        <span className="text-surface-light">•</span>
        <Link href="/privatnost" className="hover:text-foreground transition-colors">
          Politika privatnosti
        </Link>
      </div>
    </div>
  );
}
