import { useEffect, useMemo, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { FilterPanel } from './components/FilterPanel'
import { HistoryPage } from './components/HistoryPage'
import { ProfilePage } from './components/ProfilePage'
import { AtlasPage } from './components/AtlasPage'
import { FicheModal } from './components/FicheModal'
import { QuizContentPage } from './components/QuizContentPage'
import { QuizPage, type GameMode } from './components/QuizPage'
import { ResultPage } from './components/ResultPage'
import type { AnswersByQuestion, Difficulty, Quiz, Question } from './types/quiz'
import type { Profile } from './types/profile'
import { LocaleProvider, useLocale, useT } from './i18n'
import { applyLocale, DEFAULT_LOCALE, resolveLocale, type Locale } from './i18n/locale'
import type { Dataset, DatasetView, QuizAppSpec, SchemaConfig } from './types/app'
import { engineConfig } from './config'
import { buildQuestionResultPayloads, buildQuizResultPayload, fetchQuizHistory, saveQuestionResults, saveQuizResult } from './utils/quizHistory'
import { fetchProfile, saveProfile } from './utils/profile'
import { checkIsAdmin } from './utils/adminAccess'
import { applyTheme } from './utils/theme'
import { parseQuiz } from './utils/quizValidation'
import { formatNumber } from './utils/number'
import { generateQuiz, inferSchema, parseCsv, randomSeed } from './utils/quizGenerator'
import type { GenSchema, Row } from './utils/quizGenerator'
import { isSoundMuted, playClick, setSoundMuted } from './utils/sound'
import { BLITZ_MAX_ERRORS, BLITZ_QUESTION_COUNT, BLITZ_SECONDS, blitzPool, blitzStats, previousBestBlitz, previousBestBlitzScore } from './utils/blitz'
import type { BlitzSummaryData } from './components/BlitzSummary'
import { GameExtras, type DailySummaryData } from './components/GameExtras'
import type { RecordSummaryData } from './components/RecordSummary'
import { DailyChallengePanel } from './components/DailyChallengePanel'
import { ReviewPanel } from './components/ReviewPanel'
import { earnedBadges, addBadges, playedAllModesToday, pushBadges, readBadges, syncBadges, writeBadges, type BadgeContext, type BadgeId, type OwnedBadges } from './utils/badges'
import { DAILY_QUESTION_COUNT, claimDaily, dailyKey, dailyRank, dailySeed, dailyStreak, fetchDailyLeaderboard, fetchMyDaily, finishDaily, finishedLocalDays, markDailyFinished, markDailyStarted, pickDailyIds, readDailyLocal, selectDaily } from './utils/dailyChallenge'
import { shuffle } from './utils/shuffle'

type BuiltinView = 'start' | 'quiz' | 'results' | 'content' | 'history' | 'profile' | 'atlas'
/** Vues intégrées, ou id d'une vue propre au jeu de données (`Dataset.views`). */
type View = BuiltinView | (string & {})

const questionCounts = [5, 10, 20, 30, 50]
/** Durées proposées pour le contre-la-montre, en minutes ; 0 = illimité. */
const timeAttackDurations = [5, 10, 15, 20, 0]

function fallbackQuiz(title: string): Quiz {
  return {
    version: '1.0',
    metadata: { title, author: title, createdAt: new Date().toISOString().slice(0, 10), description: 'Importe un CSV pour générer un quiz.' },
    categories: [{ id: 'dataset', label: title }],
    questions: [],
  }
}

/** Clé stable d'un jeu de données pour l'agrégation d'historique (indépendante de la langue). */
function historyKeyOf(dataset: Dataset | null, quiz: Quiz): string {
  return dataset ? dataset.schema.title : quiz.metadata.title
}

function safeGenerate(spec: QuizAppSpec, dataset: Dataset, seed: string, locale: Locale = DEFAULT_LOCALE, blitz = false): { quiz: Quiz; error: string } {
  const schema = {
    ...dataset.schema,
    ...(dataset.nouns?.[locale] ? { noun: dataset.nouns[locale] } : {}),
    ...(dataset.titles?.[locale] ? { title: dataset.titles[locale] } : {}),
  }
  try {
    return {
      quiz: parseQuiz(generateQuiz(dataset.rows, schema, {
        seed, locale, i18n: dataset.i18n, aliases: dataset.aliases, shapes: dataset.shapes, author: engineConfig().appName,
        // Réserve du blitz : QCM à 4 choix (les 4 cases) et questions « inverses » à réponses-images.
        ...(blitz ? { choices: 4, inverse: true } : {}),
      })),
      error: '',
    }
  } catch (error) {
    return { quiz: fallbackQuiz(spec.fallbackTitle), error: error instanceof Error ? error.message : 'Génération impossible.' }
  }
}

/** État de départ (jeu de données + premier quiz) construit une fois par spec depuis le CSV embarqué. */
const initialStates = new WeakMap<QuizAppSpec, { dataset: Dataset | null; quiz: Quiz }>()
function initialStateOf(spec: QuizAppSpec): { dataset: Dataset | null; quiz: Quiz } {
  let state = initialStates.get(spec)
  if (!state) {
    let rows: Row[] = []
    try { rows = parseCsv(spec.bundledCsv) } catch { /* CSV embarqué illisible : quiz de secours */ }
    const dataset = rows.length ? spec.buildDataset(rows, null) : null
    state = { dataset, quiz: dataset ? safeGenerate(spec, dataset, spec.seed).quiz : fallbackQuiz(spec.fallbackTitle) }
    initialStates.set(spec, state)
  }
  return state
}

export default function App({ spec, session }: { spec: QuizAppSpec; session: Session | null }) {
  const userId = session?.user.id ?? null
  const [profile, setProfile] = useState<Profile | null>(null)
  useEffect(() => { fetchProfile(userId).then(setProfile).catch(() => {}) }, [userId])
  const [dbData, setDbData] = useState<{ rows: Row[]; schemaConfig: SchemaConfig | null } | null>(null)
  useEffect(() => {
    if (!spec.remote) return
    Promise.all([spec.remote.fetchRows(), spec.remote.fetchSchemaConfig()])
      .then(([rows, schemaConfig]) => { if (rows?.length) setDbData({ rows, schemaConfig }) })
      .catch(() => {})
  }, [spec])
  const [isAdmin, setIsAdmin] = useState(false)
  useEffect(() => {
    if (!userId) { setIsAdmin(false); return }
    checkIsAdmin().then(setIsAdmin).catch(() => setIsAdmin(false))
  }, [userId])
  const locale = resolveLocale(profile?.locale)
  useEffect(() => { applyLocale(locale) }, [locale])
  return (
    <LocaleProvider locale={locale}>
      <AppInner spec={spec} profile={profile} onProfileChange={setProfile} session={session} dbData={dbData} isAdmin={isAdmin} />
    </LocaleProvider>
  )
}

function AppInner({ spec, profile, onProfileChange, session, dbData, isAdmin }: { spec: QuizAppSpec; profile: Profile | null; onProfileChange: (p: Profile) => void; session: Session | null; dbData: { rows: Row[]; schemaConfig: SchemaConfig | null } | null; isAdmin: boolean }) {
  const t = useT()
  const locale = useLocale()
  const tRef = useRef(t)
  tRef.current = t
  const userId = session?.user.id ?? null
  const initial = initialStateOf(spec)
  const [quiz, setQuiz] = useState<Quiz>(initial.quiz)
  const [dataset, setDataset] = useState<Dataset | null>(initial.dataset)
  // Tirage courant : seed + locale ayant produit `quiz`. Le quiz initial = seed de l'appli en FR.
  const genRef = useRef<{ seed: string; locale: Locale }>({ seed: spec.seed, locale: DEFAULT_LOCALE })
  const [ficheSubject, setFicheSubject] = useState<string | null>(null)
  const [genError, setGenError] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [difficulty, setDifficulty] = useState<Difficulty | ''>('')
  const [view, setView] = useState<View>('start')
  const [answers, setAnswers] = useState<AnswersByQuestion>({})
  const [fileError, setFileError] = useState('')
  const [questionCount, setQuestionCount] = useState(10)
  const [gameMode, setGameMode] = useState<GameMode>('classic')
  const [timeAttackMinutes, setTimeAttackMinutes] = useState(10)
  // Mode/limite de temps figés au lancement (`startQuiz`/`replayMissed`), indépendants des réglages
  // du panneau de démarrage qui restent modifiables pendant la partie sans l'affecter.
  const [activeMode, setActiveMode] = useState<GameMode>('classic')
  const [activeTimeLimit, setActiveTimeLimit] = useState<number | undefined>(undefined)
  // Vrai pour une reprise ciblée de ses erreurs : « rejouer avec les mêmes paramètres » n'a alors pas de sens.
  const [isReplay, setIsReplay] = useState(false)
  const [blitzSummary, setBlitzSummary] = useState<BlitzSummaryData | null>(null)
  // Bilan « record personnel » des 3 autres modes (classique / contre-la-montre / sans-faute) : équivalent de `blitzSummary`.
  const [modeRecordSummary, setModeRecordSummary] = useState<RecordSummaryData | null>(null)
  // Défi du jour en cours (jour joué), son bilan, badges tout juste obtenus, badges possédés.
  const [dailyRun, setDailyRun] = useState<{ day: string } | null>(null)
  const [dailySummary, setDailySummary] = useState<DailySummaryData | null>(null)
  const [newBadges, setNewBadges] = useState<BadgeId[]>([])
  const [badges, setBadges] = useState<OwnedBadges>(() => readBadges())
  const [dailyRefresh, setDailyRefresh] = useState(0)
  const [dailyError, setDailyError] = useState(false)
  const [sessionQuestions, setSessionQuestions] = useState<Quiz['questions']>([])
  const [resultQuestions, setResultQuestions] = useState<Quiz['questions']>([])
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [muted, setMuted] = useState(isSoundMuted())
  const theme = profile?.theme ?? 'lagon'
  useEffect(() => { applyTheme(theme) }, [theme])
  const [historyBack, setHistoryBack] = useState<View>('profile')
  const viewHistory = (from: View) => { setHistoryBack(from); navigate('history') }

  // Le back/swipe-back du navigateur doit se comporter comme le bouton "Retour" de l'appli plutôt que la quitter :
  // chaque navigation interne pousse une entrée d'historique, et on resynchronise `view` sur popstate.
  const viewRef = useRef(view)
  useEffect(() => { viewRef.current = view }, [view])
  useEffect(() => {
    window.history.replaceState({ view: 'start' }, '')
    const onPopState = (event: PopStateEvent) => {
      const nextView = (event.state?.view as View | undefined) ?? 'start'
      if (viewRef.current === 'quiz' && nextView !== 'quiz') {
        if (!window.confirm(tRef.current('quiz.abandonConfirm'))) {
          window.history.pushState({ view: 'quiz' }, '')
          return
        }
        setAnswers({}); setSessionQuestions([]); setElapsedSeconds(0)
      }
      setView(nextView)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])
  const navigate = (next: View) => { setView(next); window.history.pushState({ view: next }, '') }
  // Remplace l'entrée d'historique courante plutôt que d'en empiler une nouvelle : utilisé pour quitter
  // "quiz" (fin de partie ou abandon), qui n'est pas un état vers lequel on veut pouvoir revenir en arrière.
  const replace = (next: View) => { setView(next); window.history.replaceState({ view: next }, '') }
  const filteredQuestions = useMemo(() => quiz.questions.filter((question) =>
    (!selectedCategories.length || selectedCategories.includes(question.category)) && (!difficulty || question.difficulty === difficulty)), [quiz, selectedCategories, difficulty])

  // Réserve du blitz : les mêmes questions (mêmes identifiants) régénérées avec 4 choix au lieu de 3, pour les 4 cases, plus
  // les questions « inverses » (réponses = drapeaux ou silhouettes) qui n'existent que là.
  // Calculée seulement quand le mode blitz est sélectionné. Quiz sans jeu de données (JSON importé) : ses propres
  // questions à 4 choix, s'il y en a.
  const blitzSelected = gameMode === 'blitz'
  const blitzCandidates = useMemo(() => {
    if (!blitzSelected) return []
    const source = dataset ? safeGenerate(spec, dataset, genRef.current.seed, locale, true).quiz.questions : quiz.questions
    return blitzPool(source).filter((question) =>
      (!selectedCategories.length || selectedCategories.includes(question.category)) && (!difficulty || question.difficulty === difficulty))
  }, [blitzSelected, dataset, quiz, locale, selectedCategories, difficulty]) // eslint-disable-line react-hooks/exhaustive-deps
  const blitzAvailable = blitzCandidates.length

  const toggleCategory = (categoryId: string) => setSelectedCategories((previous) =>
    previous.includes(categoryId) ? previous.filter((id) => id !== categoryId) : [...previous, categoryId])

  const applyQuiz = (next: Quiz) => {
    setQuiz(next)
    setSelectedCategories([]); setDifficulty(''); setSessionQuestions([])
  }

  const applyGenerated = (nextDataset: Dataset, seed: string) => {
    const { quiz: next, error } = safeGenerate(spec, nextDataset, seed, locale)
    setGenError(error)
    if (!error) {
      genRef.current = { seed, locale }
      applyQuiz(next)
    }
  }

  // Changement de langue : on régénère le quiz courant (données + formulations traduites) avec le
  // même seed, pour une bascule immédiate. Le `subject`/`id` des questions restent FR → l'historique suit.
  useEffect(() => {
    if (dataset && genRef.current.locale !== locale) applyGenerated(dataset, genRef.current.seed)
  }, [locale, dataset]) // applyGenerated volontairement hors deps : ne dépend que de (locale, dataset)

  // Bascule silencieuse vers le dataset Supabase (éditable sans redéploiement, cf. remoteDataset.ts)
  // dès qu'il arrive — seulement si l'utilisateur n'a pas depuis importé son propre CSV (auquel cas
  // `dataset` n'est plus le dataset embarqué éditable, `editable` n'y est pas défini).
  useEffect(() => {
    if (dbData?.rows.length && dataset?.editable) {
      const nextDataset = spec.buildDataset(dbData.rows, dbData.schemaConfig)
      setDataset(nextDataset)
      applyGenerated(nextDataset, genRef.current.seed)
    }
  }, [dbData]) // volontairement seul en deps : ne doit se déclencher qu'à l'arrivée de dbData

  // Un admin a corrigé un champ depuis une fiche (FicheModal) : on met à jour la ligne concernée
  // dans le dataset en mémoire et on régénère le quiz courant (même seed), sans nouvel aller-retour
  // réseau — la ligne modifiée vient déjà de la réponse de sauvegarde.
  const handleDatasetRowUpdated = (updatedRow: Row) => {
    if (!dataset) return
    const canonical = updatedRow[dataset.schema.subjectColumn]
    const nextDataset = { ...dataset, rows: dataset.rows.map((row) => row[dataset.schema.subjectColumn] === canonical ? updatedRow : row) }
    setDataset(nextDataset)
    applyGenerated(nextDataset, genRef.current.seed)
  }

  const loadCsv = async (file?: File) => {
    if (!file) return
    try {
      const rows = parseCsv(await file.text())
      if (!rows.length) throw new Error('CSV vide ou illisible.')
      const nextDataset: Dataset = { rows, schema: inferSchema(rows) }
      setDataset(nextDataset)
      setFileError('')
      setGenError('')
      applyGenerated(nextDataset, randomSeed())
    } catch (error) {
      setFileError(error instanceof Error ? error.message : 'CSV invalide.')
    }
  }

  const generateFromPanel = (schema: GenSchema, seed: string) => {
    if (!dataset) return
    const nextDataset: Dataset = { ...dataset, schema }
    setDataset(nextDataset)
    applyGenerated(nextDataset, seed)
    navigate('start')
    // Admin sur le dataset embarqué : les réglages du panneau (colonnes incluses/séparateur, nom,
    // titre) deviennent le défaut partagé, pas seulement ce tirage — best-effort, jamais bloquant.
    if (dataset.editable && isAdmin) spec.remote?.saveSchemaConfig(schema).catch(() => {})
  }

  // Reconstruit le pool de questions depuis les mêmes données, avec un nouveau seed :
  // autres distracteurs, autres énoncés Vrai/Faux, autres regroupements de classement.
  const regenerateQuestions = () => {
    if (!dataset) return
    playClick()
    applyGenerated(dataset, randomSeed())
  }

  // Lance une partie avec les réglages courants. `avoid` = questions de la partie qu'on vient de finir :
  // les autres passent en premier (mélangées), celles-ci ne reviennent qu'en complément si le pool est trop
  // petit. `goTo` : `navigate` depuis l'accueil, `replace` depuis les résultats (le retour ramène à l'accueil).
  const beginQuiz = (avoid: Question[], goTo: (view: View) => void) => {
    playClick()
    setAnswers({})
    setIsReplay(false)
    setBlitzSummary(null)
    setModeRecordSummary(null)
    setDailyRun(null)
    setDailySummary(null)
    setNewBadges([])
    setActiveMode(gameMode)
    const seen = new Set(avoid.map((question) => question.id))
    const ordered = [...shuffle(filteredQuestions.filter((q) => !seen.has(q.id))), ...shuffle(filteredQuestions.filter((q) => seen.has(q.id)))]
    if (gameMode === 'blitz') {
      setActiveTimeLimit(undefined)
      const fresh = shuffle(blitzCandidates.filter((question) => !seen.has(question.id)))
      const again = shuffle(blitzCandidates.filter((question) => seen.has(question.id)))
      setSessionQuestions([...fresh, ...again].slice(0, BLITZ_QUESTION_COUNT))
    } else if (gameMode === 'classic') {
      setActiveTimeLimit(undefined)
      setSessionQuestions(ordered.slice(0, Math.min(questionCount, ordered.length)))
    } else {
      setActiveTimeLimit(gameMode === 'timeAttack' && timeAttackMinutes > 0 ? timeAttackMinutes * 60 : undefined)
      setSessionQuestions(ordered)
    }
    goTo('quiz')
  }
  const startQuiz = () => beginQuiz([], navigate)
  const restartQuiz = () => beginQuiz(resultQuestions, replace)

  const replayMissed = (questions: Question[]) => {
    playClick()
    setAnswers({})
    setIsReplay(true)
    setBlitzSummary(null)
    setModeRecordSummary(null)
    setDailyRun(null)
    setDailySummary(null)
    setNewBadges([])
    setActiveMode('classic')
    setActiveTimeLimit(undefined)
    setSessionQuestions(questions)
    navigate('quiz')
  }

  const backToStart = () => {
    setAnswers({})
    setSessionQuestions([])
    setResultQuestions([])
    setBlitzSummary(null)
    setModeRecordSummary(null)
    setDailyRun(null)
    setDailySummary(null)
    setNewBadges([])
    setElapsedSeconds(0)
    replace('start')
  }

  const toggleSound = () => {
    setSoundMuted(!muted)
    setMuted(!muted)
  }

  // Badges : possédés en local (affichage), fusionnés avec le cloud à la connexion.
  useEffect(() => {
    setBadges(readBadges())
    if (userId) syncBadges(userId).then(setBadges).catch(() => {})
  }, [userId])

  /** Attribue ceux que la partie vient de faire gagner, sans redonner ceux déjà obtenus. */
  const awardNewBadges = (context: BadgeContext) => {
    const owned = readBadges()
    const fresh = earnedBadges(context).filter((id) => !owned[id])
    if (!fresh.length) return
    const now = new Date().toISOString()
    const next = addBadges(owned, fresh, now)
    writeBadges(next)
    setBadges(next)
    setNewBadges((previous) => Array.from(new Set([...previous, ...fresh]))) // deux attributions possibles par partie (bilan, série du défi)
    if (userId) pushBadges(userId, fresh, now).catch(() => {})
  }

  /** Les 20 questions du jour : identifiées sur un tirage français seedé par la date, retrouvées dans la langue du joueur. */
  const dailyQuestionsFor = (day: string): Question[] => {
    if (!dataset) return []
    const seed = dailySeed(day)
    const french = safeGenerate(spec, dataset, seed, 'fr', true).quiz.questions
    const ids = pickDailyIds(french).slice(0, DAILY_QUESTION_COUNT)
    return selectDaily(locale === 'fr' ? french : safeGenerate(spec, dataset, seed, locale, true).quiz.questions, ids)
  }

  const startDaily = async () => {
    // Seulement sur le jeu de données intégré : un CSV importé n'a pas la même série pour tous.
    if (!dataset?.editable) return
    const day = dailyKey()
    setDailyError(false)
    if (!userId && readDailyLocal(day)) return
    const questions = dailyQuestionsFor(day)
    if (!questions.length) { setDailyError(true); return }
    if (userId) {
      const claim = await claimDaily(userId, day) // la tentative est réservée AVANT de voir les questions
      if (claim === 'error') { setDailyError(true); return }
      if (claim === 'already') { setDailyRefresh((value) => value + 1); return }
    }
    markDailyStarted(day)
    playClick()
    setAnswers({}); setIsReplay(false); setBlitzSummary(null); setModeRecordSummary(null); setDailySummary(null); setNewBadges([])
    setDailyRun({ day }); setActiveMode('blitz'); setActiveTimeLimit(undefined)
    setSessionQuestions(questions)
    navigate('quiz')
  }

  // Badge « semaine complète » : les jours de défi consécutifs, comptés sur cet appareil et (si connecté) dans le cloud.
  const awardDailyStreak = (day: string, cloudDays: string[]) => {
    const streak = dailyStreak([...finishedLocalDays(), ...cloudDays], day)
    awardNewBadges({ stats: null, freeBlitz: false, brokeRecord: false, history: [], currentByCategory: {}, categoryIds: [], dailyStreakDays: streak })
  }

  const finishDailyRun = (day: string, stats: BlitzSummaryData, duration: number) => {
    markDailyFinished(day, stats, duration)
    setDailySummary({ played: stats.played, correct: stats.correct, bestStreak: stats.bestStreak, points: stats.points, bonus: stats.bonus, guest: !userId })
    setDailyRefresh((value) => value + 1)
    if (!userId) { awardDailyStreak(day, []); return }
    finishDaily(userId, day, stats, duration)
      .then(() => fetchMyDaily(userId))
      .then((mine) => { awardDailyStreak(day, mine.filter((row) => row.finished_at).map((row) => row.day)) })
      .then(() => fetchDailyLeaderboard(day))
      .then((rows) => {
        setDailySummary((previous) => (previous ? { ...previous, rank: dailyRank(rows, userId) } : previous))
        setDailyRefresh((value) => value + 1)
      })
      .catch(() => {})
  }

  const viewButton = (v: DatasetView) => <button key={v.id} type="button" className="secondary" onClick={() => navigate(v.id)}>{v.icon} {t(v.labelKey)}</button>

  return <main className="app-shell">
    {spec.Background && <spec.Background />}
    <header><div><p className="eyebrow">{engineConfig().appName.toUpperCase()}</p><h1>{quiz.metadata.title}</h1><p>{t('header.by', { author: quiz.metadata.author })}</p>{view === 'start' && quiz.metadata.description && <p className="quiz-description-preview">{quiz.metadata.description}</p>}</div><div className="header-actions"><button type="button" className="secondary" onClick={toggleSound} aria-label={muted ? t('header.soundOn') : t('header.soundOff')}>{muted ? '🔇' : '🔊'}</button>{view === 'start' && <button type="button" className="secondary" onClick={() => navigate('profile')}>{profile ? `${profile.avatar} ${profile.pseudo}` : `👤 ${t('nav.profile')}`}</button>}{view === 'start' && dataset?.views?.filter((v) => v.entry === 'start').map(viewButton)}{view === 'start' && dataset && <button type="button" className="secondary" onClick={() => navigate('atlas')}>🗂️ {t('nav.fiches')}</button>}{view === 'start' && <button type="button" className="secondary" onClick={() => navigate('content')}>⚙️ {t('nav.quiz')}</button>}</div></header>
    {view === 'start' && <section className="start-page">
      {dataset?.editable && <DailyChallengePanel userId={userId} day={dailyKey()} onPlay={startDaily} refreshKey={dailyRefresh} error={dailyError} />}
      <ReviewPanel quiz={quiz} historyKey={historyKeyOf(dataset, quiz)} userId={userId} onReview={replayMissed} />
      <FilterPanel categories={quiz.categories} selectedCategories={selectedCategories} difficulty={difficulty} onCategoryToggle={toggleCategory} onDifficultyChange={setDifficulty} />
      <div className="mode-toggle" role="radiogroup" aria-label={t('start.mode.aria')}>
        <label className={gameMode === 'classic' ? 'mode-chip is-active' : 'mode-chip'}>
          <input type="radio" name="game-mode" checked={gameMode === 'classic'} onChange={() => { playClick(); setGameMode('classic') }} />
          🎯 {t('start.mode.classic')}
        </label>
        <label className={gameMode === 'timeAttack' ? 'mode-chip is-active' : 'mode-chip'}>
          <input type="radio" name="game-mode" checked={gameMode === 'timeAttack'} onChange={() => { playClick(); setGameMode('timeAttack') }} />
          ⏱️ {t('start.mode.timeAttack')}
        </label>
        <label className={gameMode === 'noMistake' ? 'mode-chip is-active' : 'mode-chip'}>
          <input type="radio" name="game-mode" checked={gameMode === 'noMistake'} onChange={() => { playClick(); setGameMode('noMistake') }} />
          🔥 {t('start.mode.noMistake')}
        </label>
        <label className={gameMode === 'blitz' ? 'mode-chip is-active' : 'mode-chip'}>
          <input type="radio" name="game-mode" checked={gameMode === 'blitz'} onChange={() => { playClick(); setGameMode('blitz') }} />
          ⚡ {t('start.mode.blitz')}
        </label>
      </div>
      {gameMode === 'classic' && <>
        <label className="question-count">{t('start.questionCount')}<select value={questionCount} onChange={(event) => { playClick(); setQuestionCount(Number(event.target.value)) }}>{questionCounts.map((count) => <option key={count} value={count} disabled={count > filteredQuestions.length}>{t(count === 1 ? 'start.count.one' : 'start.count.other', { n: count })}{count > filteredQuestions.length ? t('start.unavailableSuffix') : ''}</option>)}<option value={filteredQuestions.length}>{t('start.allQuestions', { n: formatNumber(filteredQuestions.length) })}</option></select></label>
        <p>{t('start.availability', { n: formatNumber(filteredQuestions.length), picked: Math.min(questionCount, filteredQuestions.length) })}</p>
      </>}
      {gameMode === 'timeAttack' && <>
        <label className="question-count">{t('start.duration')}<select value={timeAttackMinutes} onChange={(event) => { playClick(); setTimeAttackMinutes(Number(event.target.value)) }}>{timeAttackDurations.map((minutes) => <option key={minutes} value={minutes}>{minutes === 0 ? t('start.duration.infinite') : t(minutes === 1 ? 'start.duration.one' : 'start.duration.other', { n: minutes })}</option>)}</select></label>
        <p>{t('start.timeAttackHint', { n: formatNumber(filteredQuestions.length) })}</p>
      </>}
      {gameMode === 'noMistake' && <p>{t('start.noMistakeHint', { n: formatNumber(filteredQuestions.length) })}</p>}
      {gameMode === 'blitz' && <p>{t('start.blitzHint', { count: Math.min(BLITZ_QUESTION_COUNT, blitzAvailable), seconds: BLITZ_SECONDS, lives: BLITZ_MAX_ERRORS, n: formatNumber(blitzAvailable) })}</p>}
      <div className="quiz-actions"><button type="button" onClick={startQuiz} disabled={gameMode === 'blitz' ? !blitzAvailable : !filteredQuestions.length}>{t('start.play')}</button></div>
    </section>}
    {view === 'quiz' && <QuizPage quiz={quiz} questions={sessionQuestions} mode={activeMode} timeLimitSeconds={activeTimeLimit} onFinish={(nextAnswers, duration, shown, extra) => {
      setAnswers(nextAnswers); setResultQuestions(shown); setElapsedSeconds(duration); replace('results')
      const historyKey = historyKeyOf(dataset, quiz)
      const daily = dailyRun
      const stats = activeMode === 'blitz' ? blitzStats(shown, nextAnswers) : null
      const bonus = extra?.speedBonus ?? 0
      const payload = { ...buildQuizResultPayload(shown, nextAnswers, quiz.categories, duration, historyKey, activeMode), ...(stats ? { bonus_points: bonus } : {}) }
      // Un défi du jour n'entre pas dans l'historique blitz (ni records, ni classement blitz) : son résultat a sa propre table.
      const persist = () => {
        if (!daily) saveQuizResult(payload, session?.user.id)
        saveQuestionResults(buildQuestionResultPayloads(shown, nextAnswers, historyKey), session?.user.id)
      }
      if (daily && stats) finishDailyRun(daily.day, { ...stats, bonus }, duration)
      if (stats && !daily) setBlitzSummary({ ...stats, bonus })
      // L'historique est lu AVANT d'y enregistrer cette partie : record et badges se calculent par rapport à l'existant.
      fetchQuizHistory(session?.user.id)
        .then((rows) => {
          const previousBest = stats && !daily ? previousBestBlitz(rows, historyKey) : undefined
          if (stats && !daily) setBlitzSummary({ ...stats, bonus, previousBest, previousBestScore: previousBestBlitzScore(rows, historyKey) })

          // Record personnel des 3 autres modes (classique : score % ; contre-la-montre/sans-faute : bonnes réponses),
          // même principe que `previousBest` ci-dessus. `stats` est `null` hors blitz, donc hors défi du jour aussi.
          let modeBrokeRecord = false
          let classicFlawless = false
          let noMistakeStreak: number | undefined
          if (!stats) {
            const metricOf = (row: typeof payload) => activeMode === 'classic' ? row.score : row.correct_count
            const current = metricOf(payload)
            const modeRows = rows.filter((row) => row.quiz_title === historyKey && row.mode === activeMode)
            const prevBest = modeRows.length ? Math.max(...modeRows.map(metricOf)) : null
            const formatValue = (n: number) => activeMode === 'classic'
              ? `${n}%`
              : activeMode === 'noMistake'
                ? t(n === 1 ? 'quiz.streak.one' : 'quiz.streak.other', { n })
                : t(n === 1 ? 'unit.correctAnswers.one' : 'unit.correctAnswers.other', { n })
            modeBrokeRecord = prevBest !== null && current > prevBest
            setModeRecordSummary({
              value: formatValue(current),
              previousBest: prevBest === null ? null : formatValue(prevBest),
              isRecord: modeBrokeRecord,
              isTie: prevBest !== null && current === prevBest,
            })
            if (activeMode === 'classic') classicFlawless = payload.question_count >= 20 && payload.correct_count === payload.question_count
            if (activeMode === 'noMistake') noMistakeStreak = payload.correct_count
          }

          // Jours consécutifs en classique (indépendant du défi du jour), aujourd'hui compris.
          const classicDays = rows.filter((row) => row.mode === 'classic').map((row) => row.created_at.slice(0, 10))
          if (activeMode === 'classic' && !daily) classicDays.push(dailyKey())

          awardNewBadges({
            stats,
            freeBlitz: Boolean(stats && !daily),
            brokeRecord: Boolean((stats && !daily && typeof previousBest === 'number' && stats.correct > previousBest) || modeBrokeRecord),
            history: rows,
            currentByCategory: payload.by_category,
            categoryIds: quiz.categories.map((category) => category.id),
            noMistakeStreak,
            classicFlawless,
            classicStreakDays: activeMode === 'classic' && !daily ? dailyStreak(classicDays, dailyKey()) : undefined,
            allModesToday: playedAllModesToday(rows, activeMode, dailyKey()),
          })
        })
        .catch(() => {})
        .finally(persist)
    }} onCancel={backToStart} />}
    {view === 'results' && <ResultPage questions={resultQuestions} answers={answers} categories={quiz.categories} elapsedSeconds={elapsedSeconds} onRestartSame={isReplay || dailyRun ? undefined : restartQuiz} onBackToSettings={backToStart} onViewHistory={() => viewHistory('results')} onViewFiche={dataset ? setFicheSubject : undefined} summary={<GameExtras blitz={activeMode === 'blitz' ? blitzSummary : null} daily={dailySummary} modeRecord={activeMode === 'blitz' ? null : modeRecordSummary} newBadges={newBadges} />} />}
    {view === 'content' && <QuizContentPage quiz={quiz} dataset={dataset} onBack={() => navigate('start')} onCsvChange={loadCsv} onGenerate={generateFromPanel} onRegenerate={regenerateQuestions} fileError={fileError} genError={genError} />}
    {view === 'atlas' && dataset && <AtlasPage rows={dataset.rows} schema={dataset.schema} decor={dataset.ficheDecor} i18n={dataset.i18n} actions={dataset.views?.filter((v) => v.entry === 'atlas').map(viewButton)} onOpenFiche={setFicheSubject} onBack={() => navigate('start')} />}
    {dataset && (() => {
      const custom = dataset.views?.find((v) => v.id === view)
      return custom ? custom.render({ dataset, openFiche: setFicheSubject, back: () => navigate(custom.entry === 'atlas' ? 'atlas' : 'start') }) : null
    })()}
    {ficheSubject && dataset && (() => {
      const row = dataset.rows.find((r) => r[dataset.schema.subjectColumn] === ficheSubject)
      return row ? <FicheModal row={row} schema={dataset.schema} decor={dataset.ficheDecor} speech={dataset.speech} i18n={dataset.i18n} canEdit={isAdmin && Boolean(dataset.editable && spec.remote)} updateRow={spec.remote?.updateRow} onRowUpdated={handleDatasetRowUpdated} onClose={() => setFicheSubject(null)} /> : null
    })()}
    {view === 'history' && <HistoryPage onBack={() => navigate(historyBack)} quiz={quiz} historyKey={historyKeyOf(dataset, quiz)} userId={session?.user.id} onReplayMissed={replayMissed} />}
    {view === 'profile' && <ProfilePage profile={profile} session={session} badges={badges} onBack={() => navigate('start')} onSave={async (next) => { await saveProfile(next, session?.user.id); onProfileChange(next) }} onViewHistory={() => viewHistory('profile')} />}
    <footer className="app-footer">{t('footer.version', { hash: __COMMIT_HASH__ })}</footer>
  </main>
}
