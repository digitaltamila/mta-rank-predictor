import {
  BadgeCheck,
  BarChart3,
  BrainCircuit,
  ClipboardCheck,
  Gauge,
  LineChart,
  ListFilter,
  MapPinned,
} from 'lucide-react'

export const features = [
  {
    title: 'Score Calculator',
    description: 'Configurable positive and negative marking per exam.',
    icon: ClipboardCheck,
  },
  {
    title: 'Rank Prediction',
    description: 'Overall rank computed against submitted score distribution.',
    icon: LineChart,
  },
  {
    title: 'Category Rank',
    description: 'Category-aware ranking for configured reservation groups.',
    icon: BadgeCheck,
  },
  {
    title: 'State Rank',
    description: 'State filters with indexed leaderboard queries.',
    icon: MapPinned,
  },
  {
    title: 'Cutoff Analysis',
    description: 'Historical cutoff comparison for every active exam.',
    icon: BarChart3,
  },
  {
    title: 'Selection Chances',
    description: 'High, medium, or low probability from cutoff rules.',
    icon: BrainCircuit,
  },
  {
    title: 'Shift Analysis',
    description: 'Ready for normalization across shifts and sessions.',
    icon: ListFilter,
  },
  {
    title: 'Performance Report',
    description: 'Accuracy, attempt rate, and subject-level analytics.',
    icon: Gauge,
  },
]

export const workflowSteps = [
  'Paste Response Sheet URL',
  'System Extracts Answers',
  'Marks Calculated',
  'Rank Predicted',
]

export const examGroups = [
  {
    name: 'Railway',
    exams: ['RRB NTPC', 'RRB ALP', 'RRB Technician', 'RRB Group D'],
  },
  {
    name: 'SSC',
    exams: ['SSC CGL', 'SSC CHSL', 'SSC MTS', 'SSC GD'],
  },
  {
    name: 'Banking',
    exams: ['IBPS PO', 'IBPS Clerk', 'SBI PO', 'SBI Clerk'],
  },
  {
    name: 'Defence',
    exams: ['Army', 'Navy', 'Air Force', 'Agniveer'],
  },
  {
    name: 'TNPSC',
    exams: ['Group 1', 'Group 2', 'Group 2A', 'Group 4'],
  },
]

export const faqs = [
  {
    question: 'How does Muppadai Rank Predictor calculate scores?',
    answer:
      'The application parses the response sheet, compares selected answers with configured official answers, and applies the active scoring rule for the exam.',
  },
  {
    question: 'Can the marking scheme change for different exams?',
    answer:
      'Yes. Correct marks, negative marks, unanswered marks, and prediction thresholds are stored as configurable exam rules.',
  },
  {
    question: 'What is percentile based on?',
    answer:
      'Percentile is calculated from the predicted rank and total submitted candidates for the exam using the configured ranking pool.',
  },
  {
    question: 'Which response sheet providers are supported?',
    answer:
      'The first parser targets Digialm response sheets. The parser layer is designed to add TCS iON, MeritTrac, and Wheebox providers.',
  },
]
