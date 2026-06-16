import { useState } from 'react'
import {
  CheckCircle2,
  Download,
  Info,
  MessageSquare,
  Share2,
} from 'lucide-react'
import { createFeedback } from '../api/feedback'
import type { PredictionSummary } from '../api/predictions'
import { Card } from './ui/card'
import { Select } from './ui/select'

type ResultSummaryProps = {
  result: PredictionSummary
}

const formatInteger = (value: number | null | undefined) => {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : null
  return n === null ? 'Not enough data' : n.toLocaleString('en-IN')
}

const formatMarks = (value: number | null | undefined) => {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : null
  return n === null ? '--' : n.toFixed(2).replace(/\.00$/, '')
}

export function ResultSummary({ result }: ResultSummaryProps) {
  const [feedbackStatus, setFeedbackStatus] = useState('')
  const [feedbackType, setFeedbackType] = useState('wrong_answer')
  const [feedbackMessage, setFeedbackMessage] = useState('')

  const sections = Array.isArray(result.sections) ? result.sections : []
  const correctAnswers = result.correctAnswers ?? 0
  const wrongAnswers = result.wrongAnswers ?? 0
  const unansweredQuestions = result.unansweredQuestions ?? 0
  const totalQuestions = correctAnswers + wrongAnswers + unansweredQuestions

  const details = result.candidateDetails ?? {
    registrationNumber: null,
    community: result.category,
    testCenterName: null,
    examDate: null,
    examTime: null,
    subject: result.examName,
  }

  const detailRows = [
    details.registrationNumber ? ['Registration Number', details.registrationNumber] : null,
    ['Roll Number', result.rollNumber ?? '--'],
    ['Candidate Name', result.candidateName ?? '--'],
    ['Community', details.community ?? result.category ?? '--'],
    ['Test Center Name', details.testCenterName ?? '--'],
    ['Exam Date', details.examDate ?? '--'],
    ['Exam Time', details.examTime ?? '--'],
    ['Subject', details.subject ?? result.examName ?? '--'],
  ].filter(Boolean) as [string, string][]

  const sectionRows =
    sections.length > 0
      ? sections
      : [
          {
            name: result.examName ?? 'Overall',
            totalQuestions,
            correctAnswers,
            wrongAnswers,
            unansweredQuestions,
            score: result.score,
          },
        ]

  const generateScoreCardCanvas = async (): Promise<HTMLCanvasElement | null> => {
    const canvas = document.createElement('canvas')
    const scale = window.devicePixelRatio > 1 ? 2 : 1
    canvas.width = 1200 * scale
    canvas.height = 820 * scale
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    ctx.scale(scale, scale)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, 1200, 820)
    ctx.strokeStyle = '#d91f1f'
    ctx.lineWidth = 2
    ctx.strokeRect(32, 28, 1136, 700)
    ctx.fillStyle = '#172033'
    ctx.font = '800 34px Inter, Arial, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Muppadai Rank Predictor', 600, 76)
    ctx.fillStyle = '#747ca6'
    ctx.font = '700 20px Inter, Arial, sans-serif'
    const canvasTitle = result.examName ? `${result.examName} Score Card` : 'Score Card'
    ctx.fillText(canvasTitle, 600, 108)
    if (details.subject && details.subject !== result.examName) {
      ctx.font = '700 18px Inter, Arial, sans-serif'
      ctx.fillText(details.subject, 600, 138)
    }

    const logo = new Image()
    logo.src = '/muppadai-logo.png'
    await new Promise<void>((resolve) => {
      logo.onload = () => resolve()
      logo.onerror = () => resolve()
    })
    if (logo.complete && logo.naturalWidth > 0) {
      ctx.drawImage(logo, 1048, 58, 72, 72)
    }

    ctx.textAlign = 'left'
    ctx.font = '700 15px Inter, Arial, sans-serif'
    let y = 174
    detailRows.forEach(([label, value]) => {
      ctx.strokeStyle = '#d91f1f'
      ctx.strokeRect(32, y, 1136, 28)
      ctx.beginPath()
      ctx.moveTo(564, y)
      ctx.lineTo(564, y + 28)
      ctx.stroke()
      ctx.fillStyle = '#172033'
      ctx.fillText(label, 42, y + 19)
      ctx.font = '500 15px Inter, Arial, sans-serif'
      ctx.fillText(value, 574, y + 19)
      ctx.font = '700 15px Inter, Arial, sans-serif'
      y += 28
    })

    const headers = ['Section', 'Total', 'NA', 'Right', 'Wrong', 'Marks']
    const widths = [460, 120, 120, 140, 150, 146]
    let x = 32
    ctx.fillStyle = '#b91c1c'
    ctx.fillRect(32, y, 1136, 36)
    ctx.fillStyle = '#ffffff'
    headers.forEach((header, index) => {
      ctx.strokeStyle = '#8f1717'
      ctx.strokeRect(x, y, widths[index], 36)
      ctx.textAlign = index === 0 ? 'left' : 'center'
      ctx.fillText(header, x + (index === 0 ? 12 : widths[index] / 2), y + 24)
      x += widths[index]
    })
    y += 36

    sectionRows.forEach((section) => {
      const values = [
        section.name,
        section.totalQuestions,
        section.unansweredQuestions,
        section.correctAnswers,
        section.wrongAnswers,
        formatMarks(section.score),
      ]
      x = 32
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(32, y, 1136, 34)
      values.forEach((value, index) => {
        ctx.strokeStyle = '#d91f1f'
        ctx.strokeRect(x, y, widths[index], 34)
        ctx.fillStyle = '#172033'
        ctx.textAlign = index === 0 ? 'left' : 'center'
        ctx.font = '500 15px Inter, Arial, sans-serif'
        ctx.fillText(String(value), x + (index === 0 ? 12 : widths[index] / 2), y + 22)
        x += widths[index]
      })
      y += 34
    })

    x = 32
    const totals = ['Total', totalQuestions, unansweredQuestions, correctAnswers, wrongAnswers, formatMarks(result.score)]
    ctx.fillStyle = '#f4d12f'
    ctx.fillRect(32, y, 1136, 36)
    totals.forEach((value, index) => {
      ctx.strokeStyle = '#d91f1f'
      ctx.strokeRect(x, y, widths[index], 36)
      ctx.fillStyle = '#111827'
      ctx.textAlign = 'center'
      ctx.font = '800 15px Inter, Arial, sans-serif'
      ctx.fillText(String(value), x + widths[index] / 2, y + 24)
      x += widths[index]
    })

    ctx.textAlign = 'center'
    ctx.fillStyle = '#172033'
    ctx.font = '600 16px Inter, Arial, sans-serif'
    ctx.fillText(
      `Marking Scheme: +${result.markingScheme?.correctMarks ?? '--'} for Correct, -${result.markingScheme?.negativeMarks ?? '--'} for Incorrect`,
      600,
      770,
    )
    ctx.fillStyle = '#747ca6'
    ctx.font = '500 13px Inter, Arial, sans-serif'
    ctx.fillText(
      `Generated by Muppadai Rank Predictor · ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`,
      600,
      798,
    )

    return canvas
  }

  const downloadScoreCard = async () => {
    const canvas = await generateScoreCardCanvas()
    if (!canvas) return
    const url = canvas.toDataURL('image/jpeg', 0.92)
    const link = document.createElement('a')
    link.href = url
    link.download = 'muppadai-score-card.jpg'
    link.click()
  }

  const shareResult = async () => {
    const siteUrl = window.location.origin
    const shareText = `${result.examName ?? 'Exam'} Score: ${formatMarks(result.score)} marks · Rank: ${formatInteger(result.predictedRank)}\nCheck yours at ${siteUrl}`

    // Try sharing with the scorecard image
    try {
      const canvas = await generateScoreCardCanvas()
      if (canvas && navigator.canShare) {
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, 'image/jpeg', 0.92),
        )
        if (blob) {
          const file = new File([blob], 'muppadai-score-card.jpg', { type: 'image/jpeg' })
          const shareData = { files: [file], text: shareText, url: siteUrl }
          if (navigator.canShare(shareData)) {
            await navigator.share(shareData)
            return
          }
        }
      }
    } catch {
      // image share not supported — fall through
    }

    // Fallback: share URL + text
    if (navigator.share) {
      await navigator.share({ title: 'Muppadai Rank Predictor', text: shareText, url: siteUrl })
      return
    }

    // Final fallback: copy to clipboard
    await navigator.clipboard.writeText(`${shareText}\n${siteUrl}`)
  }

  const sendFeedback = async () => {
    await createFeedback({
      predictionRunId: result.id,
      type: feedbackType,
      message: feedbackMessage,
    })
    setFeedbackMessage('')
    setFeedbackStatus('Saved in the admin inbox.')
  }

  return (
    <section
      className="mx-auto grid w-full max-w-4xl gap-5 px-4 py-10"
      aria-label="Prediction result"
    >
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-green/30 bg-green/10 px-3.5 py-1.5 text-sm font-bold text-green">
          <CheckCircle2 aria-hidden size={16} />
          Your result is ready
        </span>
        <h2 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          Your Official-Style Score Card
        </h2>
      </div>

      <div className="overflow-hidden rounded-lg border-2 border-[#d91f1f] bg-white text-xs text-foreground shadow-[0_16px_42px_rgba(17,24,39,0.10)] sm:text-sm">
        <div className="grid grid-cols-[1fr_74px] items-center gap-3 border-b border-[#d91f1f] p-3 text-center sm:grid-cols-[1fr_104px] sm:p-4">
          <div>
            <h2 className="text-xl font-extrabold text-foreground sm:text-2xl md:text-3xl">
              Muppadai Rank Predictor
            </h2>
            <p className="mt-1 text-sm font-bold text-text3 sm:text-lg">
              {result.examName ? `${result.examName} Score Card` : 'Score Card'}
            </p>
            {details.subject && details.subject !== result.examName && (
              <p className="mt-1 text-xs font-semibold text-text3 sm:text-base">
                {details.subject}
              </p>
            )}
          </div>
          <img
            src="/muppadai-logo.png"
            alt=""
            className="mx-auto h-14 w-14 object-contain sm:h-20 sm:w-20"
          />
        </div>

        <table className="w-full table-fixed border-collapse">
          <tbody>
            {detailRows.map(([label, value]) => (
              <tr key={label} className="border-b border-[#d91f1f]">
                <th className="w-[44%] border-r border-[#d91f1f] px-2 py-1.5 text-left font-extrabold align-top">
                  {label}
                </th>
                <td className="break-words px-2 py-1.5">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div>
          <table className="w-full table-fixed border-collapse text-center text-[10px] sm:text-sm">
            <thead className="bg-[#b91c1c] text-white">
              <tr>
                <th className="w-[34%] border-r border-[#8f1717] px-1 py-2 sm:px-3">Section</th>
                <th className="w-[13%] border-r border-[#8f1717] px-1 py-2 sm:px-3">Total</th>
                <th className="w-[11%] border-r border-[#8f1717] px-1 py-2 sm:px-3">NA</th>
                <th className="w-[13%] border-r border-[#8f1717] px-1 py-2 sm:px-3">Right</th>
                <th className="w-[13%] border-r border-[#8f1717] px-1 py-2 sm:px-3">Wrong</th>
                <th className="w-[16%] px-1 py-2 sm:px-3">Marks</th>
              </tr>
            </thead>
            <tbody>
              {sectionRows.map((section) => (
                <tr key={section.name} className="border-b border-[#d91f1f]">
                  <td className="break-words border-r border-[#d91f1f] px-1 py-1.5 text-left sm:px-2">
                    {section.name}
                  </td>
                  <td className="border-r border-[#d91f1f] px-1 py-1.5 sm:px-2">
                    {section.totalQuestions}
                  </td>
                  <td className="border-r border-[#d91f1f] px-1 py-1.5 sm:px-2">
                    {section.unansweredQuestions}
                  </td>
                  <td className="border-r border-[#d91f1f] px-1 py-1.5 sm:px-2">
                    {section.correctAnswers}
                  </td>
                  <td className="border-r border-[#d91f1f] px-1 py-1.5 sm:px-2">
                    {section.wrongAnswers}
                  </td>
                  <td className="px-1 py-1.5 sm:px-2">{formatMarks(section.score)}</td>
                </tr>
              ))}
              <tr className="bg-[#f4d12f] font-extrabold text-[#111827]">
                <td className="border-r border-[#d91f1f] px-1 py-1.5 sm:px-2">Total</td>
                <td className="border-r border-[#d91f1f] px-1 py-1.5 sm:px-2">{totalQuestions}</td>
                <td className="border-r border-[#d91f1f] px-1 py-1.5 sm:px-2">{unansweredQuestions}</td>
                <td className="border-r border-[#d91f1f] px-1 py-1.5 sm:px-2">{correctAnswers}</td>
                <td className="border-r border-[#d91f1f] px-1 py-1.5 sm:px-2">{wrongAnswers}</td>
                <td className="px-1 py-1.5 sm:px-2">{formatMarks(result.score)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-center text-sm text-muted-foreground">
        Marking Scheme: +{result.markingScheme?.correctMarks ?? '--'} for Correct,
        -{result.markingScheme?.negativeMarks ?? '--'} for Incorrect.
      </div>

      <div className="grid grid-cols-2 gap-3 sm:flex sm:justify-center">
        <button
          type="button"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-green px-6 text-base font-bold text-white shadow-[0_10px_24px_rgba(20,122,74,0.22)] transition hover:bg-green/90"
          onClick={() => void downloadScoreCard()}
        >
          <Download aria-hidden size={18} />
          Download
        </button>
        <button
          type="button"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-border bg-surface px-6 text-base font-bold text-navy transition hover:bg-muted"
          onClick={() => void shareResult()}
        >
          <Share2 aria-hidden size={18} />
          Share
        </button>
      </div>

      <Card className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ['Overall Rank', result.predictedRank],
          ['Category Rank', result.categoryRank],
          ['State Rank', result.stateRank],
          ['Gender Rank', result.genderRank],
          ['Horizontal Rank', result.communityRank],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-md bg-muted p-4 text-center">
            <p className="text-sm font-semibold text-muted-foreground">{label}</p>
            <p className="mt-2 text-xl font-extrabold text-foreground">
              {typeof value === 'number' ? formatInteger(value) : 'Not enough data'}
            </p>
          </div>
        ))}
      </Card>

      <div className="flex items-start gap-2.5 rounded-lg border border-navy/20 bg-navy/5 px-4 py-3">
        <Info aria-hidden size={16} className="mt-0.5 shrink-0 text-navy" />
        <p className="text-sm leading-relaxed text-navy/80">
          These ranks are based on{' '}
          <span className="font-bold text-navy">{result.totalParticipants.toLocaleString('en-IN')} student{result.totalParticipants !== 1 ? 's' : ''}</span>{' '}
          who checked their scores on Muppadai Rank Predictor. Your actual exam rank will be
          determined by all candidates who appeared in the exam.
        </p>
      </div>

      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <MessageSquare aria-hidden className="text-navy" size={18} />
          <h3 className="text-lg font-bold text-foreground">Message to Admin</h3>
        </div>
        <div className="grid gap-3">
          <Select
            value={feedbackType}
            onChange={(event) => setFeedbackType(event.target.value)}
          >
            <option value="wrong_answer">Suspicious Question / Wrong Answer</option>
            <option value="message">Message to Admin</option>
            <option value="feedback">Feedback</option>
          </Select>
          <textarea
            className="min-h-28 w-full rounded-md border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-navy focus:ring-2 focus:ring-navy/20"
            placeholder="Select the section and question number, then explain the issue."
            value={feedbackMessage}
            onChange={(event) => setFeedbackMessage(event.target.value)}
          />
          <button
            type="button"
            className="inline-flex h-10 items-center justify-center rounded-md bg-navy px-4 text-sm font-bold text-white transition hover:bg-navy/90"
            onClick={() => void sendFeedback()}
            disabled={feedbackMessage.trim() === ''}
          >
            Send
          </button>
          {feedbackStatus && (
            <p className="text-sm font-medium text-green">{feedbackStatus}</p>
          )}
        </div>
      </Card>
    </section>
  )
}
