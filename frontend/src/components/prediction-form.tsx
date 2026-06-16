import { zodResolver } from '@hookform/resolvers/zod'
import { type ChangeEvent, useState } from 'react'
import { BellRing, Clock3, FileUp, Loader2, WandSparkles, X } from 'lucide-react'
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
  ['rrb', 'RRB'],
  ['ssc', 'SSC'],
  ['others', 'Others'],
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

          return host === 'digialm.com' || host.endsWith('.digialm.com')
        } catch {
          return false
        }
      },
      {
        message:
          'Only Digialm response sheet URLs are supported in this module.',
      },
    ),
  category: z.string().min(1, 'Choose your category.'),
  gender: z.string().optional(),
  state: z.string().optional(),
  uploadedHtml: z.string().optional(),
  examTab: z.enum(['ssc', 'rrb', 'others']),
  consent: z.boolean().refine((value) => value, {
    message: 'Please agree before submitting.',
  }),
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
  const [activeTab, setActiveTab] = useState<'ssc' | 'rrb' | 'others'>('rrb')
  const [comingSoonTab, setComingSoonTab] = useState<'ssc' | 'others' | null>(
    null,
  )
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
      examTab: 'rrb',
      consent: false,
    },
  })

  const fieldError = errors.responseSheetUrl?.message
  const consentError = errors.consent?.message

  const submitForm = (values: PredictionFormValues) => {
    onSubmit(values)
  }

  const switchTab = (tab: 'ssc' | 'rrb' | 'others') => {
    setActiveTab(tab)
    setValue('examTab', tab)

    if (tab !== 'rrb') {
      setComingSoonTab(tab)
      return
    }

    setComingSoonTab(null)
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
      className="w-full rounded-lg border border-border bg-surface/95 p-4 text-left shadow-[0_16px_40px_rgba(17,24,39,0.08)] backdrop-blur sm:p-6"
      onSubmit={handleSubmit(submitForm)}
      noValidate
    >
      <div className="mb-5 border-b border-border pb-4">
        <div className="mb-4 inline-flex rounded-md border border-border bg-muted p-1">
          {examTabs.map(([tab, label]) => (
            <button
              key={tab}
              type="button"
              className={`rounded px-4 py-2 text-sm font-bold transition ${
                activeTab === tab
                  ? 'bg-navy text-white'
                  : 'text-muted-foreground hover:bg-surface hover:text-foreground'
              }`}
              onClick={() => switchTab(tab)}
            >
              {label}
            </button>
          ))}
        </div>
        <h2 className="text-2xl font-extrabold text-foreground">
          Score Calculator
        </h2>
      </div>

      {comingSoonTab ? (
        <div className="flex min-h-[340px] items-center justify-center rounded-md border border-dashed border-border bg-cream px-4 py-10 text-center">
          <div className="max-w-md">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-md bg-navy/10 text-navy">
              <Clock3 className="animate-pulse" aria-hidden size={28} />
            </div>
            <p className="text-2xl font-extrabold text-foreground">
              {comingSoonTab === 'ssc'
                ? 'SSC calculator is coming soon.'
                : 'Other exam calculators are coming soon.'}
            </p>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              We are preparing parser rules, cutoff logic, and rank pools for
              this section. RRB calculation is live now.
            </p>
            <div className="mx-auto mt-5 inline-flex items-center gap-2 rounded-md border border-yellow bg-yellow/20 px-3 py-2 text-sm font-bold text-navy">
              <BellRing aria-hidden size={17} />
              New exam modules will appear here once enabled.
            </div>
          </div>
        </div>
      ) : (
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
                placeholder="https://rrb.digialm.com/....html"
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
                  Category <span className="text-red">*</span>
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

            <label className="flex items-start gap-3 text-sm leading-6 text-muted-foreground">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-border text-navy focus:ring-navy"
                {...register('consent')}
              />
              <span>
                I agree that my exam data can be used to generate my report and
                aggregated rank insights.
              </span>
            </label>

            <Button
              type="submit"
              size="lg"
              className="w-full text-base"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin" aria-hidden size={18} />
              ) : (
                <WandSparkles aria-hidden size={18} />
              )}
              Check Your Rank & Score
            </Button>
            {isSubmitting && (
              <div className="rounded-md border border-navy/20 bg-navy/5 p-3">
                <div className="flex items-center gap-3 text-sm font-bold text-navy">
                  <Loader2 className="animate-spin" aria-hidden size={17} />
                  Reading answer key and calculating marks...
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-navy/15">
                  <div className="h-full w-2/3 animate-pulse rounded-full bg-navy" />
                </div>
              </div>
            )}
          </div>
          {(fieldError ||
            errors.category?.message ||
            consentError ||
            errorMessage) && (
            <p
              id="prediction-form-message"
              className="px-2 pt-2 text-left text-sm font-medium text-red"
              role="alert"
            >
              {fieldError ??
                errors.category?.message ??
                consentError ??
                errorMessage}
            </p>
          )}
        </>
      )}
    </form>
  )
}
