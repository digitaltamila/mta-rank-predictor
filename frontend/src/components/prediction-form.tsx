import { zodResolver } from '@hookform/resolvers/zod'
import { useState, useRef } from 'react'
import { CheckCircle2, Loader2, WandSparkles } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { sendOtp, verifyOtp } from '../api/predictions'
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
      { message: 'Enter a Digialm URL (RRB) or cbexams URL (SSC) from your response sheet.' },
    ),
  category: z.string().optional(),
  gender: z.string().optional(),
  state: z.string().optional(),
  uploadedHtml: z.string().optional(),
  examTab: z.enum(['ssc', 'rrb']),
  mobile: z.string().optional(),
  studentName: z.string().optional(),
  otpSessionToken: z.string().optional(),
})

export type PredictionFormValues = z.infer<typeof predictionSchema>

type PredictionFormProps = {
  isSubmitting: boolean
  errorMessage?: string
  onSubmit: (values: PredictionFormValues) => void
}

export function PredictionForm({ isSubmitting, errorMessage, onSubmit }: PredictionFormProps) {
  const [activeTab, setActiveTab] = useState<'ssc' | 'rrb'>('ssc')

  // Step 1: OTP verification state
  const [step, setStep] = useState<'otp' | 'form'>('otp')
  const [studentNameInput, setStudentNameInput] = useState('')
  const [mobileInput, setMobileInput] = useState('')
  const [otpInput, setOtpInput] = useState('')
  const [otpSending, setOtpSending] = useState(false)
  const [otpVerifying, setOtpVerifying] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [otpError, setOtpError] = useState<string | null>(null)
  const [verifiedMobile, setVerifiedMobile] = useState<string | null>(null)
  const otpInputRef = useRef<HTMLInputElement>(null)

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<PredictionFormValues>({
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

  const handleSendOtp = async () => {
    const cleaned = mobileInput.trim()
    if (!/^[6-9]\d{9}$/.test(cleaned)) {
      setOtpError('Enter a valid 10-digit Indian mobile number.')
      return
    }
    setOtpError(null)
    setOtpSending(true)
    try {
      await sendOtp(cleaned)
      setOtpSent(true)
      setTimeout(() => otpInputRef.current?.focus(), 100)
    } catch (e: unknown) {
      setOtpError(e instanceof Error ? e.message : 'Failed to send OTP.')
    } finally {
      setOtpSending(false)
    }
  }

  const handleVerifyOtp = async () => {
    const cleaned = otpInput.trim()
    if (cleaned.length !== 6) {
      setOtpError('Enter the 6-digit OTP sent to your mobile.')
      return
    }
    setOtpError(null)
    setOtpVerifying(true)
    try {
      const result = await verifyOtp(mobileInput.trim(), cleaned)
      setVerifiedMobile(result.mobile)
      setValue('mobile', result.mobile)
      setValue('studentName', studentNameInput.trim() || undefined)
      setValue('otpSessionToken', result.session_token)
      setStep('form')
    } catch (e: unknown) {
      setOtpError(e instanceof Error ? e.message : 'Invalid OTP. Please try again.')
    } finally {
      setOtpVerifying(false)
    }
  }

  return (
    <div className="w-full rounded-xl border border-border bg-surface/95 text-left shadow-[0_20px_50px_rgba(17,24,39,0.10)] ring-1 ring-navy/5 backdrop-blur">
      {/* Step indicator */}
      <div className="flex items-center gap-0 border-b border-border">
        {(['otp', 'form'] as const).map((s, idx) => {
          const done = s === 'otp' && step === 'form'
          const active = s === step
          return (
            <div
              key={s}
              className={`flex flex-1 items-center gap-2 px-4 py-3 text-xs font-bold transition ${
                active ? 'text-navy' : done ? 'text-green-600' : 'text-muted-foreground'
              }`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold ${
                  done
                    ? 'bg-green-600 text-white'
                    : active
                      ? 'bg-navy text-white'
                      : 'border border-border text-muted-foreground'
                }`}
              >
                {done ? <CheckCircle2 size={12} /> : idx + 1}
              </span>
              {s === 'otp' ? 'Verify Mobile' : 'Check Rank'}
            </div>
          )
        })}
      </div>

      {/* ── Step 1: OTP Verification ── */}
      {step === 'otp' && (
        <div className="p-4 sm:p-6">
          <div className="mb-5">
            <h2 className="text-xl font-extrabold leading-tight text-foreground sm:text-2xl">
              Verify Your Mobile
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter your mobile number to receive your rank result via WhatsApp and save your result history.
            </p>
          </div>

          <div className="grid gap-4">
            <label className="grid gap-2" htmlFor="student-name">
              <span className="text-sm font-semibold text-foreground">Your Name</span>
              <Input
                id="student-name"
                type="text"
                placeholder="Enter your full name"
                value={studentNameInput}
                onChange={(e) => setStudentNameInput(e.target.value)}
                disabled={otpSent}
              />
            </label>

            <label className="grid gap-2" htmlFor="otp-mobile">
              <span className="text-sm font-semibold text-foreground">
                Mobile Number <span className="text-red">*</span>
              </span>
              <div className="flex gap-2">
                <Input
                  id="otp-mobile"
                  type="tel"
                  inputMode="numeric"
                  placeholder="10-digit mobile number"
                  value={mobileInput}
                  onChange={(e) => setMobileInput(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  disabled={otpSent}
                  maxLength={10}
                />
                {!otpSent && (
                  <Button
                    type="button"
                    variant="secondary"
                    className="shrink-0"
                    disabled={otpSending || mobileInput.length < 10}
                    onClick={handleSendOtp}
                  >
                    {otpSending ? <Loader2 className="animate-spin" size={16} /> : 'Send OTP'}
                  </Button>
                )}
              </div>
            </label>

            {otpSent && (
              <label className="grid gap-2" htmlFor="otp-code">
                <span className="text-sm font-semibold text-foreground">
                  OTP <span className="text-red">*</span>
                </span>
                <div className="flex gap-2">
                  <Input
                    id="otp-code"
                    ref={otpInputRef}
                    type="text"
                    inputMode="numeric"
                    placeholder="Enter 6-digit OTP"
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    className="shrink-0"
                    disabled={otpVerifying || otpInput.length < 6}
                    onClick={handleVerifyOtp}
                  >
                    {otpVerifying ? <Loader2 className="animate-spin" size={16} /> : 'Verify'}
                  </Button>
                </div>
                <button
                  type="button"
                  className="self-start text-xs text-navy underline underline-offset-2"
                  onClick={() => { setOtpSent(false); setOtpInput(''); setOtpError(null) }}
                >
                  Change number
                </button>
              </label>
            )}

            {otpError && (
              <p className="text-sm font-medium text-red" role="alert">{otpError}</p>
            )}

            {!otpSent && (
              <p className="text-xs text-muted-foreground">
                An OTP will be sent to your mobile via SMS. Standard rates apply.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Step 2: URL + Filters form ── */}
      {step === 'form' && (
        <form className="p-4 sm:p-6" onSubmit={handleSubmit(submitForm)} noValidate>
          {/* Verified badge */}
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold leading-tight text-foreground sm:text-2xl">
                Score &amp; Rank Calculator
              </h2>
              <p className="text-xs font-medium text-muted-foreground">
                Choose your exam and paste the answer-key URL.
              </p>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1.5 text-xs font-bold text-green-700">
              <CheckCircle2 size={13} aria-hidden />
              {verifiedMobile}
            </div>
          </div>

          <div className="mb-5 border-b border-border pb-5">
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
                placeholder={
                  activeTab === 'ssc'
                    ? 'https://sscexams.cbexams.com/...aspx?enckey=...'
                    : 'https://rrb.digialm.com/....html'
                }
                aria-invalid={Boolean(fieldError)}
                aria-describedby={fieldError || errorMessage ? 'prediction-form-message' : undefined}
                {...register('responseSheetUrl')}
              />
            </label>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="grid gap-2" htmlFor="category">
                <span className="text-sm font-semibold text-foreground">Category</span>
                <Select id="category" {...register('category')}>
                  <option value="">Choose</option>
                  {categoryOptions.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </Select>
              </label>

              <label className="grid gap-2" htmlFor="gender">
                <span className="text-sm font-semibold text-foreground">Gender</span>
                <Select id="gender" {...register('gender')}>
                  {genderOptions.map(([value, label]) => (
                    <option key={label} value={value}>{label}</option>
                  ))}
                </Select>
              </label>

              <label className="grid gap-2" htmlFor="state">
                <span className="text-sm font-semibold text-foreground">State</span>
                <Select id="state" {...register('state')}>
                  {stateOptions.map(([value, label]) => (
                    <option key={label} value={value}>{label}</option>
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
                  {['Reading answer key', 'Calculating marks', 'Predicting rank'].map((step, index) => (
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
        </form>
      )}
    </div>
  )
}
