import { academyQuestions } from "../data/academyQuestions"
import type {
  AcademyCourse,
  AcademyEvaluation,
  AcademyUpdate,
} from "../data/academiaData"

const STORAGE_KEY = "ditalcar-academia-state-v2"

export type AcademyAttempt = {
  id: string
  evaluationId: string
  attemptNumber: number
  questionIds: string[]
  answers: Record<string, number>
  score: number
  passed: boolean
  createdAt: string
  reinforcementIds: string[]
}

export type ObservableValue = "CUMPLE" | "PARCIAL" | "NO_CUMPLE"

export type AcademyFeedbackValue = "SI" | "PARCIAL" | "NO"

export type AcademyFeedback = {
  id: string
  contentId: string
  contentType: "PLAYBOOK" | "CURSO" | "MATERIAL"
  authorEmail: string
  authorName: string
  useful: AcademyFeedbackValue
  understood: AcademyFeedbackValue
  sufficient: AcademyFeedbackValue
  comment: string
  createdAt: string
}

export type AcademyObservation = {
  id: string
  targetName: string
  targetEmail?: string
  local: string
  brand?: string
  observerName: string
  observerEmail: string
  createdAt: string
  values: Record<string, ObservableValue>
  comment: string
  score: number
}

type AcademyState = {
  favorites: string[]
  seenUpdates: string[]
  completedModules: Record<string, string[]>
  attempts: AcademyAttempt[]
  observations: AcademyObservation[]
  feedback: AcademyFeedback[]
}

const emptyState: AcademyState = {
  favorites: [],
  seenUpdates: [],
  completedModules: {},
  attempts: [],
  observations: [],
  feedback: [],
}

function readState(): AcademyState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...emptyState }
    const parsed = JSON.parse(raw) as Partial<AcademyState>
    return {
      favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [],
      seenUpdates: Array.isArray(parsed.seenUpdates) ? parsed.seenUpdates : [],
      completedModules:
        parsed.completedModules && typeof parsed.completedModules === "object"
          ? parsed.completedModules
          : {},
      attempts: Array.isArray(parsed.attempts) ? parsed.attempts : [],
      observations: Array.isArray(parsed.observations)
        ? parsed.observations
        : [],
      feedback: Array.isArray(parsed.feedback) ? parsed.feedback : [],
    }
  } catch {
    return { ...emptyState }
  }
}

function writeState(state: AcademyState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  // Avisa al menú lateral para recalcular el número de cursos pendientes.
  if (typeof window !== "undefined") window.dispatchEvent(new Event("ditalapp-badges"))
}

export function getAcademyState() {
  return readState()
}

export function toggleAcademyFavorite(id: string) {
  const state = readState()
  state.favorites = state.favorites.includes(id)
    ? state.favorites.filter((item) => item !== id)
    : [...state.favorites, id]
  writeState(state)
  return state.favorites
}

export function markAcademyUpdateSeen(id: string) {
  const state = readState()
  if (!state.seenUpdates.includes(id)) {
    state.seenUpdates.push(id)
    writeState(state)
  }
}

export function getUnseenUpdates(updates: AcademyUpdate[]) {
  const state = readState()
  return updates.filter((item) => !state.seenUpdates.includes(item.id))
}

export function getCompletedModules(courseId: string) {
  return readState().completedModules[courseId] ?? []
}

export function markCourseModuleComplete(courseId: string, moduleId: string) {
  const state = readState()
  const current = state.completedModules[courseId] ?? []
  if (!current.includes(moduleId)) {
    state.completedModules[courseId] = [...current, moduleId]
    writeState(state)
  }
  return state.completedModules[courseId] ?? []
}

export function getCourseProgress(course: AcademyCourse) {
  const completed = getCompletedModules(course.id)
  if (!course.modules.length) return course.seedProgress
  const calculated = Math.round((completed.length / course.modules.length) * 100)
  return Math.max(course.seedProgress, calculated)
}

export function getEvaluationAttempts(evaluationId: string) {
  return readState().attempts
    .filter((item) => item.evaluationId === evaluationId)
    .sort((a, b) => a.attemptNumber - b.attemptNumber)
}

function shuffle<T>(items: T[]) {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export function createQuestionSet(evaluation: AcademyEvaluation) {
  const attempts = getEvaluationAttempts(evaluation.id)
  const usedIds = new Set(attempts.flatMap((attempt) => attempt.questionIds))
  const bank = academyQuestions.filter(
    (question) => question.evaluationId === evaluation.id
  )
  const available = bank.filter((question) => !usedIds.has(question.id))

  if (attempts.length >= evaluation.attempts) return []

  return shuffle(available).slice(0, evaluation.questionsPerAttempt)
}

export function saveEvaluationAttempt(
  evaluation: AcademyEvaluation,
  questionIds: string[],
  answers: Record<string, number>
) {
  const state = readState()
  const previous = state.attempts.filter(
    (item) => item.evaluationId === evaluation.id
  )
  const questions = academyQuestions.filter((question) =>
    questionIds.includes(question.id)
  )
  const correct = questions.reduce(
    (total, question) =>
      total + (answers[question.id] === question.correctIndex ? 1 : 0),
    0
  )
  const score = questions.length
    ? Math.round((correct / questions.length) * 100)
    : 0
  const reinforcementIds = Array.from(
    new Set(
      questions
        .filter((question) => answers[question.id] !== question.correctIndex)
        .flatMap((question) => question.reinforcement)
    )
  )

  const attempt: AcademyAttempt = {
    id: `${evaluation.id}-${Date.now()}`,
    evaluationId: evaluation.id,
    attemptNumber: previous.length + 1,
    questionIds,
    answers,
    score,
    passed: score >= evaluation.passing,
    createdAt: new Date().toISOString(),
    reinforcementIds,
  }

  state.attempts.push(attempt)
  writeState(state)
  return attempt
}

export function evaluationNeedsReinforcement(evaluation: AcademyEvaluation) {
  const attempts = getEvaluationAttempts(evaluation.id)
  if (attempts.some((attempt) => attempt.passed)) return false
  return attempts.length >= evaluation.attempts
}

export function getEvaluationBestScore(evaluationId: string) {
  const attempts = getEvaluationAttempts(evaluationId)
  if (!attempts.length) return undefined
  return Math.max(...attempts.map((attempt) => attempt.score))
}

export function getEvaluationLastScore(evaluationId: string) {
  const attempts = getEvaluationAttempts(evaluationId)
  return attempts.at(-1)?.score
}

export function getEvaluationReinforcementIds(evaluationId: string) {
  const attempts = getEvaluationAttempts(evaluationId)
  return Array.from(
    new Set(attempts.flatMap((attempt) => attempt.reinforcementIds))
  )
}

export function saveAcademyObservation(
  input: Omit<AcademyObservation, "id" | "createdAt" | "score">
) {
  const state = readState()
  const values = Object.values(input.values)
  const points = values.reduce((total, value) => {
    if (value === "CUMPLE") return total + 2
    if (value === "PARCIAL") return total + 1
    return total
  }, 0)
  const score = values.length
    ? Math.round((points / (values.length * 2)) * 100)
    : 0

  const observation: AcademyObservation = {
    ...input,
    id: `obs-${Date.now()}`,
    createdAt: new Date().toISOString(),
    score,
  }

  state.observations.unshift(observation)
  writeState(state)
  return observation
}

export function getAcademyObservations() {
  return readState().observations
}


export function saveAcademyFeedback(
  input: Omit<AcademyFeedback, "id" | "createdAt">
) {
  const state = readState()
  const feedback: AcademyFeedback = {
    ...input,
    id: `feedback-${Date.now()}`,
    createdAt: new Date().toISOString(),
  }
  state.feedback = state.feedback.filter(
    (item) =>
      !(item.contentId === input.contentId && item.authorEmail === input.authorEmail)
  )
  state.feedback.unshift(feedback)
  writeState(state)
  return feedback
}

export function getAcademyFeedback(contentId: string, authorEmail: string) {
  return readState().feedback.find(
    (item) => item.contentId === contentId && item.authorEmail === authorEmail
  )
}

export function hasAcademyFeedback(contentId: string, authorEmail: string) {
  return Boolean(getAcademyFeedback(contentId, authorEmail))
}
