import { Suspense, lazy, useMemo } from 'react'
import { useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  CheckCircle2,
  ChevronDown,
  DatabaseZap,
  FileSearch,
  Menu,
  ShieldCheck,
  TrendingUp,
  Trophy,
} from 'lucide-react'
import { ApiError } from './api/http'
import { createPrediction } from './api/predictions'
import { AdminPanel } from './components/admin-panel'
import type { PredictionFormValues } from './components/prediction-form'
import { PredictionForm } from './components/prediction-form'
import { Button } from './components/ui/button'
import { Card } from './components/ui/card'
import { examGroups, faqs, features, workflowSteps } from './lib/landing-content'

const navItems = ['Features', 'Exams', 'FAQ']
const heroTrustItems = [
  { label: 'Secure URL parsing', icon: ShieldCheck },
  { label: 'Instant score & rank', icon: FileSearch },
  { label: 'Free for candidates', icon: CheckCircle2 },
]
const heroStats = [
  ['25K+', 'Response sheets parsed'],
  ['12+', 'Exams supported'],
  ['<10s', 'Average result time'],
]

const ResultSummary = lazy(() =>
  import('./components/result-summary').then((module) => ({
    default: module.ResultSummary,
  })),
)

function HeroInsightVisual() {
  return (
    <motion.div
      className="relative overflow-hidden rounded-xl border border-border bg-surface shadow-[0_24px_60px_rgba(17,24,39,0.14)]"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12, duration: 0.5, ease: 'easeOut' }}
    >
      <div className="flex items-center justify-between bg-navy px-4 py-3 text-white">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green" />
          </span>
          <p className="text-xs font-bold uppercase tracking-wide">
            Live rank engine
          </p>
        </div>
        <motion.div
          className="flex h-9 w-9 items-center justify-center rounded-md bg-yellow text-navy"
          animate={{ rotate: [0, -6, 6, 0], scale: [1, 1.05, 1] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Trophy aria-hidden size={20} />
        </motion.div>
      </div>

      <div className="p-4">
        <div className="rounded-lg border border-border bg-muted/70 p-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Predicted overall rank
          </p>
          <div className="mt-1 flex items-end gap-2">
            <motion.span
              className="text-4xl font-extrabold leading-none text-navy"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              #1,248
            </motion.span>
            <span className="mb-1 inline-flex items-center gap-1 rounded bg-green/12 px-1.5 py-0.5 text-xs font-bold text-green">
              <TrendingUp aria-hidden size={13} />
              Top 8%
            </span>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            ['Score', '92.6'],
            ['Percentile', '96.4'],
            ['Category', '#214'],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-md border border-border bg-surface px-2 py-2 text-center"
            >
              <p className="text-[10px] font-bold uppercase text-muted-foreground">
                {label}
              </p>
              <p className="mt-0.5 text-sm font-extrabold text-foreground">
                {value}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-4 border-t border-border pt-3">
          <div className="flex h-14 items-end gap-1.5" aria-hidden>
            {[28, 44, 32, 58, 40, 52, 36, 48].map((height, index) => (
              <motion.span
                key={`${height}-${index}`}
                className={`flex-1 rounded-t ${index === 3 ? 'bg-yellow' : 'bg-navy/85'}`}
                initial={{ height: 10 }}
                animate={{ height: [height * 0.55, height, height * 0.75] }}
                transition={{
                  duration: 2.8,
                  delay: index * 0.12,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] font-bold text-muted-foreground">
            <span>Score distribution</span>
            <span className="text-green">Your band</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function CandidateApp() {
  const predictionMutation = useMutation({
    mutationFn: createPrediction,
  })

  const formError = useMemo(() => {
    if (!predictionMutation.error) {
      return undefined
    }

    if (predictionMutation.error instanceof ApiError) {
      return predictionMutation.error.message
    }

    return 'Prediction service is not reachable right now.'
  }, [predictionMutation.error])

  const handleSubmit = (values: PredictionFormValues) => {
    predictionMutation.mutate(values)
  }

  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a
            href="#top"
            className="flex items-center gap-3 font-bold text-foreground"
            aria-label="Muppadai Rank Predictor home"
          >
            <img
              src="/muppadai-logo.png"
              alt="Muppadai Academy"
              className="h-10 w-10 object-contain"
            />
            <span className="leading-tight">
              <span className="block text-sm font-extrabold">
                Muppadai Academy
              </span>
              <span className="block text-[11px] font-semibold text-muted-foreground">
                Rank Predictor
              </span>
            </span>
          </a>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
            {navItems.map((item) => (
              <a
                key={item}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
                href={`#${item.toLowerCase()}`}
              >
                {item}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <a
              href="#calculator"
              className="hidden h-10 items-center justify-center rounded-md bg-navy px-4 text-sm font-bold text-white transition hover:bg-navy/90 md:inline-flex"
            >
              Check Your Rank
            </a>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label="Open navigation"
              title="Menu"
            >
              <Menu aria-hidden size={19} />
            </Button>
          </div>
        </div>
      </header>

      <main id="top">
        <section className="relative isolate overflow-hidden bg-background">
          <div className="absolute inset-0 hero-grid" aria-hidden />
          <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
            <motion.div
              className="mx-auto w-full max-w-6xl"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
            >
              <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_350px]">
                <div>
                  <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-1.5 text-sm font-semibold text-navy shadow-[0_12px_30px_rgba(17,24,39,0.08)]">
                    <DatabaseZap aria-hidden size={15} className="text-yellow" />
                    Result-season ready rank intelligence
                  </div>
                  <h1 className="max-w-3xl text-4xl font-extrabold leading-[1.08] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                    Predict Your Rank{' '}
                    <span className="text-navy">Before Official Results</span>
                  </h1>
                  <p className="mt-4 max-w-xl text-base font-medium leading-7 text-muted-foreground sm:text-lg">
                    Paste your Digialm response sheet and get an accurate score,
                    percentile, and predicted rank in seconds — built for Indian
                    competitive exam aspirants.
                  </p>
                  <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2.5">
                    {heroTrustItems.map((item) => {
                      const Icon = item.icon

                      return (
                        <li
                          key={item.label}
                          className="flex items-center gap-2 text-sm font-semibold text-foreground"
                        >
                          <Icon className="text-green" aria-hidden size={17} />
                          {item.label}
                        </li>
                      )
                    })}
                  </ul>
                </div>
                <HeroInsightVisual />
              </div>

              <div id="calculator" className="mt-8 scroll-mt-24 max-w-5xl">
                <PredictionForm
                  isSubmitting={predictionMutation.isPending}
                  errorMessage={formError}
                  onSubmit={handleSubmit}
                />
              </div>

              <dl className="mt-8 grid grid-cols-3 gap-3 rounded-xl border border-border bg-surface/80 p-4 backdrop-blur sm:gap-4 sm:p-5">
                {heroStats.map(([value, label]) => (
                  <div key={label} className="text-center">
                    <dt className="text-2xl font-extrabold text-navy sm:text-3xl">
                      {value}
                    </dt>
                    <dd className="mt-1 text-[11px] font-semibold leading-tight text-muted-foreground sm:text-sm">
                      {label}
                    </dd>
                  </div>
                ))}
              </dl>
            </motion.div>
          </div>
        </section>

        {predictionMutation.data && (
          <Suspense fallback={null}>
            <ResultSummary result={predictionMutation.data} />
          </Suspense>
        )}

        <section
          id="features"
          className="border-y border-border bg-muted/45 py-14"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <p className="text-sm font-bold uppercase text-navy">
                  Prediction Suite
                </p>
                <h2 className="mt-2 text-3xl font-bold text-foreground">
                  Candidate rank workflows in one platform
                </h2>
              </div>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                The first module focuses on URL ingestion, scoring, ranking,
                cutoff comparison, and analytics surfaces backed by
                configurable exam rules.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((feature, index) => {
                const Icon = feature.icon
                const palette = [
                  'bg-navy/10 text-navy',
                  'bg-green/10 text-green',
                  'bg-blue/10 text-blue',
                  'bg-red/10 text-red',
                ][index % 4]

                return (
                  <Card
                    key={feature.title}
                    className="p-5 transition duration-200 hover:-translate-y-1 hover:border-navy/40 hover:shadow-[0_18px_40px_rgba(17,24,39,0.10)]"
                  >
                    <div
                      className={`mb-4 flex h-11 w-11 items-center justify-center rounded-md ${palette}`}
                    >
                      <Icon aria-hidden size={21} />
                    </div>
                    <h3 className="text-base font-bold text-foreground">
                      {feature.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {feature.description}
                    </p>
                  </Card>
                )
              })}
            </div>
          </div>
        </section>

        <section className="py-14">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
            <div>
              <p className="text-sm font-bold uppercase text-navy">
                How It Works
              </p>
              <h2 className="mt-2 text-3xl font-bold text-foreground">
                From response sheet to actionable rank signal
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {workflowSteps.map((step, index) => (
                <div
                  key={step}
                  className="flex min-h-28 gap-4 rounded-lg border border-border bg-surface p-5"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-navy text-sm font-bold text-white">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="font-bold text-foreground">{step}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {index === 0 &&
                        'Candidates submit the original Digialm response sheet URL.'}
                      {index === 1 &&
                        'The parser validates the URL and extracts answers into structured records.'}
                      {index === 2 &&
                        'The scoring engine applies the active exam marking rule.'}
                      {index === 3 &&
                        'Ranks, percentile, and selection probability are calculated from submitted scores.'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="exams"
          className="border-y border-border bg-navy py-14 text-white"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <p className="text-sm font-bold uppercase text-yellow">
                  Exam Support
                </p>
                <h2 className="mt-2 text-3xl font-bold">
                  Built for high-volume Indian competitive exams
                </h2>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-5">
              {examGroups.map((group) => (
                <div
                  key={group.name}
                  className="rounded-lg border border-white/15 bg-white/[0.08] p-5"
                >
                  <h3 className="font-bold">{group.name}</h3>
                  <ul className="mt-4 space-y-3 text-sm text-white/85">
                    {group.exams.map((exam) => (
                      <li key={exam} className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-yellow" />
                        {exam}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className="py-14">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8">
              <p className="text-sm font-bold uppercase text-navy">FAQ</p>
              <h2 className="mt-2 text-3xl font-bold text-foreground">
                Rank predictor questions candidates search for
              </h2>
            </div>
            <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
              {faqs.map((faq) => (
                <details key={faq.question} className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 font-bold text-foreground transition hover:bg-muted/60">
                    {faq.question}
                    <ChevronDown
                      className="faq-chevron shrink-0 text-navy transition-transform duration-200"
                      aria-hidden
                      size={18}
                    />
                  </summary>
                  <p className="px-5 pb-5 text-sm leading-6 text-muted-foreground">
                    {faq.answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

function App() {
  return window.location.pathname.startsWith('/admin') ? (
    <AdminPanel />
  ) : (
    <CandidateApp />
  )
}

export default App
