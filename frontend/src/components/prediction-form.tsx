import { zodResolver } from '@hookform/resolvers/zod'
import { type ChangeEvent, useState } from 'react'
import { FileUp, Loader2, WandSparkles, X } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Select } from './ui/select'

const categoryOptions = [
  ['UR', 'UR (General)'],
  ['OBC', 'OBC'],
  ['SC', 'SC'],
  ['ST', 'ST'],
  ['EWS', 'EWS'],
] as const

const genderOptions = [
  ['', '-- Select --'],
  ['Male', 'Male'],
  ['Female', 'Female'],
  ['Other', 'Other'],
] as const

const stateOptions = [
  ['', '-- Select --'],
  ['Andaman and Nicobar Islands', 'Andaman and Nicobar Islands'],
  ['Andhra Pradesh', 'Andhra Pradesh'],
  ['Arunachal Pradesh', 'Arunachal Pradesh'],
  ['Assam', 'Assam'],
  ['Bihar', 'Bihar'],
  ['Chandigarh', 'Chandigarh'],
  ['Chhattisgarh', 'Chhattisgarh'],
  ['Delhi', 'Delhi'],
  ['Goa', 'Goa'],
  ['Gujarat', 'Gujarat'],
  ['Haryana', 'Haryana'],
  ['Himachal Pradesh', 'Himachal Pradesh'],
  ['Jammu and Kashmir', 'Jammu and Kashmir'],
  ['Jharkhand', 'Jharkhand'],
  ['Karnataka', 'Karnataka'],
  ['Kerala', 'Kerala'],
  ['Madhya Pradesh', 'Madhya Pradesh'],
  ['Maharashtra', 'Maharashtra'],
  ['Odisha', 'Odisha'],
  ['Punjab', 'Punjab'],
  ['Rajasthan', 'Rajasthan'],
  ['Tamil Nadu', 'Tamil Nadu'],
  ['Telangana', 'Telangana'],
  ['Uttar Pradesh', 'Uttar Pradesh'],
  ['Uttarakhand', 'Uttarakhand'],
  ['West Bengal', 'West Bengal'],
] as const

const examTabs = [
  ['ssc', 'SSC GD'],
  ['rrb', 'RRB'],
] as const

const predictionSchema = z.object({
  responseSheetUrl: z
    .string()
    .trim()
    .url('Enter a valid response sheet URL.')
    .refine(
      (url) => {
        try {
          const host = new URL(url).hostname.toLowerCase()
          const isDigialm = host === 'digialm.com' || host.endsWith('.digialm.com')
          const isCbexams = host === 'cbexams.com' || host.endsWith('.cbexams.com')

          return isDigialm || isCbexams
        } catch {
          return false
        }
      },
      {
        message:
          'Enter a Digialm URL (RRB) or cbexams URL (SSC) from your response sheet.',
      },
    ),
  category: z.string().optional(),
  gender: z.string().optional(),
  state: z.string().optional(),
  uploadedHtml: z.string().optional(),
  examTab: z.enum(['ssc', 'rrb']),
})

export type PredictionFormValues = z.infer<typeof predictionSchema>

type PredictionFormProps = {
  isSubmitting: boolean
  errorMessage?: string
  onSubmit: (values: PredictionFormValues) => void
}

export function PredictionForm({
  isSubmitting,
  errorMessage,
  onSubmit,
}: PredictionFormProps) {
  const [activeTab, setActiveTab] = useState<'ssc' | 'rrb'>('ssc')
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<PredictionFormValues>({
    resolver: zodResolver(predictionSchema),
    defaultValues: {
      responseSheetUrl: '',
      category: '',
      gender: '',
      state: 'Tamil Nadu',
      uploadedHtml: '',
      examTab: 'ssc',
    },
  })

  const fieldError = errors.responseSheetUrl?.message

  const submitForm = (values: PredictionFormValues) => {
    onSubmit(values)
  }

  const switchTab = (tab: 'ssc' | 'rrb') => {
    setActiveTab(tab)
    setValue('examTab', tab)
  }

  const handleHtmlUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    const html = await file.text()
    setUploadedFileName(file.name)
    setValue('uploadedHtml', html)
  }

  const clearUploadedHtml = () => {
    setUploadedFileName(null)
    setValue('uploadedHtml', '')
  }

  return (
    <form
      className="w-full rounded-xl border border-border bg-surface/95 p-4 text-left shadow-[0_20px_50px_rgba(17,24,39,0.10)] ring-1 ring-navy/5 backdrop-blur sm:p-6"
      onSubmit={handleSubmit(submitForm)}
      noValidate
    >
      <div className="mb-5 border-b border-border pb-5">
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-navy/10 text-navy">
            <WandSparkles aria-hidden size={18} />
          </span>
          <div>
            <h2 className="text-xl font-extrabold leading-tight text-foreground sm:text-2xl">
              Score &amp; Rank Calculator
            </h2>
            <p className="text-xs font-medium text-muted-foreground">
              Choose your exam and paste the answer-key URL.
            </p>
          </div>
        </div>
        <div
          className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-muted p-1"
          role="tablist"
          aria-label="Exam type"
        >
          {examTabs.map(([tab, label]) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              className={`rounded-md px-3 py-2 text-sm font-bold transition ${
                activeTab === tab
                  ? 'bg-navy text-white shadow-sm'
                  : 'text-muted-foreground hover:bg-surface hover:text-foreground'
              }`}
              onClick={() => switchTab(tab)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <>
          <div className="grid gap-4">
            <label className="grid gap-2" htmlFor="response-sheet-url">
              <span className="text-sm font-semibold text-foreground">
                Answer Key URL <span className="text-red">*</span>
              </span>
              <Input
                id="response-sheet-url"
                type="url"
                inputMode="url"
                autoComplete="url"
                placeholder={activeTab === 'ssc' ? 'https://sscexams.cbexams.com/...aspx?enckey=...' : 'https://rrb.digialm.com/....html'}
                aria-invalid={Boolean(fieldError)}
                aria-describedby={
                  fieldError || errorMessage
                    ? 'prediction-form-message'
                    : undefined
                }
                {...register('responseSheetUrl')}
              />
            </label>

            <div className="rounded-md border border-dashed border-border bg-cream p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-foreground">
                    Server cannot access the URL?
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Save the answer-key page as HTML and upload it here.
                  </p>
                </div>
                <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-bold text-navy transition hover:bg-muted">
                  <FileUp aria-hidden size={17} />
                  Upload HTML
                  <input
                    type="file"
                    accept=".html,.htm,text/html"
                    className="sr-only"
                    onChange={handleHtmlUpload}
                  />
                </label>
              </div>
              {uploadedFileName && (
                <div className="mt-3 flex items-center justify-between gap-3 rounded-md bg-surface px-3 py-2 text-sm text-muted-foreground">
                  <span className="truncate">{uploadedFileName}</span>
                  <button
                    type="button"
                    className="text-red"
                    title="Remove uploaded HTML"
                    onClick={clearUploadedHtml}
                  >
                    <X aria-hidden size={16} />
                  </button>
                </div>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="grid gap-2" htmlFor="category">
                <span className="text-sm font-semibold text-foreground">
                  Category
                </span>
                <Select
                  id="category"
                  aria-invalid={Boolean(errors.category)}
                  {...register('category')}
                >
                  <option value="">Choose</option>
                  {categoryOptions.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </label>

              <label className="grid gap-2" htmlFor="gender">
                <span className="text-sm font-semibold text-foreground">
                  Gender
                </span>
                <Select id="gender" {...register('gender')}>
                  {genderOptions.map(([value, label]) => (
                    <option key={label} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </label>

              <label className="grid gap-2" htmlFor="state">
                <span className="text-sm font-semibold text-foreground">
                  State
                </span>
                <Select id="state" {...register('state')}>
                  {stateOptions.map(([value, label]) => (
                    <option key={label} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </label>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full text-base shadow-[0_12px_28px_rgba(36,49,143,0.28)]"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin" aria-hidden size={18} />
              ) : (
                <WandSparkles aria-hidden size={18} />
              )}
              {isSubmitting ? 'Calculating…' : 'Check Your Rank & Score'}
            </Button>
            {isSubmitting && (
              <div
                className="rounded-lg border border-navy/15 bg-navy/[0.04] p-4"
                role="status"
                aria-live="polite"
              >
                <div className="flex items-center gap-2 text-sm font-bold text-navy">
                  <Loader2 className="animate-spin" aria-hidden size={16} />
                  Processing your response sheet…
                </div>
                <div className="relative mt-3 h-1.5 overflow-hidden rounded-full bg-navy/15">
                  <div className="animate-indeterminate absolute inset-y-0 w-1/3 rounded-full bg-navy" />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {[
                    'Reading answer key',
                    'Calculating marks',
                    'Predicting rank',
                  ].map((step, index) => (
                    <div
                      key={step}
                      className="animate-step-pulse flex items-center gap-1.5 text-[11px] font-semibold text-navy"
                      style={{ animationDelay: `${index * 0.45}s` }}
                    >
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-navy" />
                      {step}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          {(fieldError || errorMessage) && (
            <p
              id="prediction-form-message"
              className="px-2 pt-2 text-left text-sm font-medium text-red"
              role="alert"
            >
              {fieldError ?? errorMessage}
            </p>
          )}
      </>
    </form>
  )
}
