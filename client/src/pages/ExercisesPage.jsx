import { useState, useEffect, useRef } from 'react';
import { exerciseStorage } from '../utils/storage';
import './ExercisesPage.css';

const EXERCISES = [
    {
        id: 'breathing',
        name: 'Box Breathing',
        icon: '🌬️',
        description: 'A calming technique used by Navy SEALs. Breathe in 4 counts, hold 4, out 4, hold 4.',
        duration: '2-5 min',
        category: 'Breathing',
    },
    {
        id: 'grounding',
        name: '5-4-3-2-1 Grounding',
        icon: '🌿',
        description: 'Anchor yourself in the present by engaging your five senses.',
        duration: '5 min',
        category: 'Grounding',
    },
    {
        id: 'bodyscan',
        name: 'Body Scan',
        icon: '🧘',
        description: 'Progressive relaxation from head to toe, releasing tension.',
        duration: '10 min',
        category: 'Relaxation',
    },
    {
        id: 'thought',
        name: 'Thought Challenge',
        icon: '💭',
        description: 'CBT technique to identify and reframe negative thoughts.',
        duration: '10 min',
        category: 'CBT',
    },
];

export default function ExercisesPage() {
    const [activeExercise, setActiveExercise] = useState(null);
    const [streak, setStreak] = useState(0);

    useEffect(() => {
        setStreak(exerciseStorage.getStreak());
    }, []);

    const handleComplete = (exerciseId) => {
        exerciseStorage.log({ type: exerciseId });
        setStreak(exerciseStorage.getStreak());
        setActiveExercise(null);
    };

    return (
        <div className="exercises-page">
            <div className="page-header">
                <h1>🧘 Exercises</h1>
                <p>Calm your mind with guided exercises</p>
            </div>

            <div className="streak-banner">
                <span className="streak-icon">🔥</span>
                <span className="streak-text">
                    {streak > 0 ? `${streak} day streak!` : 'Start your streak today!'}
                </span>
            </div>

            {!activeExercise ? (
                <div className="exercises-grid">
                    {EXERCISES.map((exercise) => (
                        <div
                            key={exercise.id}
                            className="card exercise-card"
                            onClick={() => setActiveExercise(exercise)}
                        >
                            <span className="exercise-icon">{exercise.icon}</span>
                            <h3>{exercise.name}</h3>
                            <p>{exercise.description}</p>
                            <div className="exercise-meta">
                                <span className="exercise-duration">⏱️ {exercise.duration}</span>
                                <span className="exercise-category">{exercise.category}</span>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <ExercisePlayer
                    exercise={activeExercise}
                    onComplete={handleComplete}
                    onBack={() => setActiveExercise(null)}
                />
            )}
        </div>
    );
}

function ExercisePlayer({ exercise, onComplete, onBack }) {
    if (exercise.id === 'breathing') {
        return <BreathingExercise onComplete={() => onComplete(exercise.id)} onBack={onBack} />;
    }
    if (exercise.id === 'grounding') {
        return <GroundingExercise onComplete={() => onComplete(exercise.id)} onBack={onBack} />;
    }
    if (exercise.id === 'bodyscan') {
        return <BodyScanExercise onComplete={() => onComplete(exercise.id)} onBack={onBack} />;
    }
    if (exercise.id === 'thought') {
        return <ThoughtChallengeExercise onComplete={() => onComplete(exercise.id)} onBack={onBack} />;
    }
    return null;
}

function BreathingExercise({ onComplete, onBack }) {
    const [phase, setPhase] = useState('ready'); // ready, inhale, hold1, exhale, hold2, done
    const [cycles, setCycles] = useState(0);
    const [count, setCount] = useState(4);
    const totalCycles = 4;

    useEffect(() => {
        if (phase === 'ready' || phase === 'done') return;

        const timer = setInterval(() => {
            setCount(c => {
                if (c <= 1) {
                    // Move to next phase
                    if (phase === 'inhale') setPhase('hold1');
                    else if (phase === 'hold1') setPhase('exhale');
                    else if (phase === 'exhale') setPhase('hold2');
                    else if (phase === 'hold2') {
                        if (cycles + 1 >= totalCycles) {
                            setPhase('done');
                        } else {
                            setCycles(c => c + 1);
                            setPhase('inhale');
                        }
                    }
                    return 4;
                }
                return c - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [phase, cycles]);

    const start = () => {
        setPhase('inhale');
        setCycles(0);
        setCount(4);
    };

    const getPhaseText = () => {
        switch (phase) {
            case 'inhale': return 'Breathe In';
            case 'hold1': return 'Hold';
            case 'exhale': return 'Breathe Out';
            case 'hold2': return 'Hold';
            default: return '';
        }
    };

    return (
        <div className="exercise-player breathing-exercise">
            <button onClick={onBack} className="back-btn">← Back</button>

            <h2>🌬️ Box Breathing</h2>

            {phase === 'ready' && (
                <div className="exercise-intro">
                    <p>Box breathing helps calm your nervous system.</p>
                    <p>Follow the visual guide: breathe in, hold, breathe out, hold - each for 4 seconds.</p>
                    <button onClick={start} className="btn btn-primary start-btn">
                        Begin Exercise
                    </button>
                </div>
            )}

            {phase !== 'ready' && phase !== 'done' && (
                <div className="breathing-visual">
                    <div className={`breath-circle ${phase}`}>
                        <span className="breath-count">{count}</span>
                    </div>
                    <p className="phase-text">{getPhaseText()}</p>
                    <p className="cycle-count">Cycle {cycles + 1} of {totalCycles}</p>
                </div>
            )}

            {phase === 'done' && (
                <div className="exercise-complete">
                    <span className="complete-icon">✨</span>
                    <h3>Great job!</h3>
                    <p>You completed {totalCycles} cycles of box breathing.</p>
                    <button onClick={onComplete} className="btn btn-primary">
                        Mark Complete
                    </button>
                </div>
            )}
        </div>
    );
}

function GroundingExercise({ onComplete, onBack }) {
    const [step, setStep] = useState(0);
    const [inputs, setInputs] = useState({ see: '', touch: '', hear: '', smell: '', taste: '' });

    const steps = [
        { key: 'see', num: 5, sense: 'SEE', icon: '👁️', prompt: 'Name 5 things you can SEE right now' },
        { key: 'touch', num: 4, sense: 'TOUCH', icon: '✋', prompt: 'Name 4 things you can TOUCH right now' },
        { key: 'hear', num: 3, sense: 'HEAR', icon: '👂', prompt: 'Name 3 things you can HEAR right now' },
        { key: 'smell', num: 2, sense: 'SMELL', icon: '👃', prompt: 'Name 2 things you can SMELL right now' },
        { key: 'taste', num: 1, sense: 'TASTE', icon: '👅', prompt: 'Name 1 thing you can TASTE right now' },
    ];

    const currentStep = steps[step];

    const handleNext = () => {
        if (step < steps.length - 1) {
            setStep(s => s + 1);
        } else {
            setStep(-1); // Done
        }
    };

    return (
        <div className="exercise-player grounding-exercise">
            <button onClick={onBack} className="back-btn">← Back</button>

            <h2>🌿 5-4-3-2-1 Grounding</h2>

            {step >= 0 && step < steps.length && (
                <div className="grounding-step">
                    <div className="grounding-progress">
                        {steps.map((s, i) => (
                            <div
                                key={s.key}
                                className={`progress-dot ${i < step ? 'done' : ''} ${i === step ? 'active' : ''}`}
                            >
                                {s.num}
                            </div>
                        ))}
                    </div>

                    <span className="step-icon">{currentStep.icon}</span>
                    <h3>{currentStep.prompt}</h3>

                    <textarea
                        value={inputs[currentStep.key]}
                        onChange={(e) => setInputs({ ...inputs, [currentStep.key]: e.target.value })}
                        placeholder={`List ${currentStep.num} things...`}
                        className="grounding-input"
                    />

                    <button onClick={handleNext} className="btn btn-primary">
                        {step < steps.length - 1 ? 'Next →' : 'Finish'}
                    </button>
                </div>
            )}

            {step === -1 && (
                <div className="exercise-complete">
                    <span className="complete-icon">🌟</span>
                    <h3>You're grounded!</h3>
                    <p>You've reconnected with your senses and the present moment.</p>
                    <button onClick={onComplete} className="btn btn-primary">
                        Mark Complete
                    </button>
                </div>
            )}
        </div>
    );
}

function BodyScanExercise({ onComplete, onBack }) {
    const [step, setStep] = useState(0);

    const bodyParts = [
        { name: 'Head & Face', instruction: 'Relax your forehead, jaw, and facial muscles.' },
        { name: 'Neck & Shoulders', instruction: 'Release tension in your neck and let your shoulders drop.' },
        { name: 'Arms & Hands', instruction: 'Feel warmth flowing through your arms to your fingertips.' },
        { name: 'Chest & Back', instruction: 'Take a deep breath and relax your chest and upper back.' },
        { name: 'Stomach & Hips', instruction: 'Soften your belly and relax your lower back.' },
        { name: 'Legs & Feet', instruction: 'Release tension from your thighs down to your toes.' },
    ];

    useEffect(() => {
        if (step >= 0 && step < bodyParts.length) {
            const timer = setTimeout(() => {
                setStep(s => s + 1);
            }, 8000);
            return () => clearTimeout(timer);
        }
    }, [step]);

    return (
        <div className="exercise-player bodyscan-exercise">
            <button onClick={onBack} className="back-btn">← Back</button>

            <h2>🧘 Body Scan</h2>

            {step === 0 && (
                <div className="exercise-intro">
                    <p>Find a comfortable position and close your eyes if you'd like.</p>
                    <button onClick={() => setStep(1)} className="btn btn-primary">
                        Begin Scan
                    </button>
                </div>
            )}

            {step > 0 && step <= bodyParts.length && (
                <div className="bodyscan-step">
                    <div className="bodyscan-progress">
                        Step {step} of {bodyParts.length}
                    </div>
                    <h3>{bodyParts[step - 1].name}</h3>
                    <p>{bodyParts[step - 1].instruction}</p>
                    <div className="pulse-circle"></div>
                </div>
            )}

            {step > bodyParts.length && (
                <div className="exercise-complete">
                    <span className="complete-icon">😌</span>
                    <h3>Fully Relaxed</h3>
                    <p>You've scanned your entire body and released tension.</p>
                    <button onClick={onComplete} className="btn btn-primary">
                        Mark Complete
                    </button>
                </div>
            )}
        </div>
    );
}

function ThoughtChallengeExercise({ onComplete, onBack }) {
    const [step, setStep] = useState(0);
    const [answers, setAnswers] = useState({
        thought: '',
        evidence: '',
        against: '',
        balanced: '',
    });

    const steps = [
        { key: 'thought', title: 'Identify the Thought', prompt: 'What negative thought is bothering you?' },
        { key: 'evidence', title: 'Evidence For', prompt: 'What evidence supports this thought?' },
        { key: 'against', title: 'Evidence Against', prompt: 'What evidence contradicts this thought?' },
        { key: 'balanced', title: 'Balanced View', prompt: 'Write a more balanced, realistic thought.' },
    ];

    const currentStep = steps[step];

    return (
        <div className="exercise-player thought-exercise">
            <button onClick={onBack} className="back-btn">← Back</button>

            <h2>💭 Thought Challenge</h2>

            {step < steps.length && (
                <div className="thought-step">
                    <div className="thought-progress">
                        Step {step + 1} of {steps.length}
                    </div>
                    <h3>{currentStep.title}</h3>
                    <p>{currentStep.prompt}</p>

                    <textarea
                        value={answers[currentStep.key]}
                        onChange={(e) => setAnswers({ ...answers, [currentStep.key]: e.target.value })}
                        placeholder="Write your response..."
                        className="thought-input"
                    />

                    <div className="thought-actions">
                        {step > 0 && (
                            <button onClick={() => setStep(s => s - 1)} className="btn btn-ghost">
                                ← Previous
                            </button>
                        )}
                        <button
                            onClick={() => setStep(s => s + 1)}
                            className="btn btn-primary"
                            disabled={!answers[currentStep.key].trim()}
                        >
                            {step < steps.length - 1 ? 'Next →' : 'Finish'}
                        </button>
                    </div>
                </div>
            )}

            {step >= steps.length && (
                <div className="exercise-complete">
                    <span className="complete-icon">🧠</span>
                    <h3>Thought Reframed!</h3>
                    <div className="reframe-summary">
                        <div className="summary-item">
                            <span className="summary-label">Original:</span>
                            <p>"{answers.thought}"</p>
                        </div>
                        <div className="summary-item balanced">
                            <span className="summary-label">Balanced:</span>
                            <p>"{answers.balanced}"</p>
                        </div>
                    </div>
                    <button onClick={onComplete} className="btn btn-primary">
                        Mark Complete
                    </button>
                </div>
            )}
        </div>
    );
}
