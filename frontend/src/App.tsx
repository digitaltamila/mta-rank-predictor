import { Suspense, lazy, useMemo } from 'react'
import { useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  CheckCircle2,
  DatabaseZap,
  Menu,
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
const ResultSummary = lazy(() =>
  import('./components/result-summary').then((module) => ({
    default: module.ResultSummary,
  })),
)

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
          <div className="mx-auto grid min-h-[76svh] max-w-6xl content-center px-4 py-12 sm:px-6 lg:px-8">
            <motion.div
              className="mx-auto w-full max-w-5xl"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
            >
              <div className="mb-5 inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm font-semibold text-navy shadow-[0_16px_40px_rgba(17,24,39,0.08)]">
                <DatabaseZap aria-hidden size={16} />
                Result-season ready rank intelligence
              </div>
              <h1 className="max-w-3xl text-4xl font-extrabold leading-tight text-foreground sm:text-5xl lg:text-6xl">
                Muppadai Rank Predictor
              </h1>
              <p className="mt-4 max-w-3xl text-lg font-medium text-muted-foreground sm:text-xl">
                Predict Your Rank Before Official Results
              </p>
              <div className="mt-8">
                <PredictionForm
                  isSubmitting={predictionMutation.isPending}
                  errorMessage={formError}
                  onSubmit={handleSubmit}
                />
              </div>
              <div className="mt-6 grid gap-3 text-sm font-medium text-muted-foreground sm:grid-cols-3">
                {['Secure URL parsing', 'Redis-backed ranking', 'Configurable cutoffs'].map(
                  (item) => (
                    <span key={item} className="flex items-center gap-2">
                      <CheckCircle2
                        className="text-green"
                        aria-hidden
                        size={17}
                      />
                      {item}
                    </span>
                  ),
                )}
              </div>
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
              {features.map((feature) => {
                const Icon = feature.icon

                return (
                  <Card key={feature.title} className="p-5">
                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-md bg-green/10 text-green">
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
              <Button type="button" variant="secondary">
                Configurable exams
                <ArrowRight aria-hidden size={17} />
              </Button>
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
            <div className="divide-y divide-border rounded-lg border border-border bg-surface">
              {faqs.map((faq) => (
                <details key={faq.question} className="group p-5">
                  <summary className="cursor-pointer list-none font-bold text-foreground">
                    {faq.question}
                  </summary>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
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
