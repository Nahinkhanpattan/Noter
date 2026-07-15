import React, { useState } from 'react';
import { useStore } from '../store';
import { HelpCircle, Layers, CheckCircle2, XCircle, RotateCcw, ArrowRight, Check } from 'lucide-react';

export default function StudyModules() {
  const { flashcards, quizzes } = useStore();
  const [activeTab, setActiveTab] = useState('flashcards'); // 'flashcards' or 'quiz'

  // Flashcards state
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Quiz state
  const [quizAnswers, setQuizAnswers] = useState({}); // { [quizIndex]: selectedOption }
  const [quizSubmitted, setQuizSubmitted] = useState({}); // { [quizIndex]: boolean }
  const [quizScore, setQuizScore] = useState(0);

  // Reset Flashcards
  const resetFlashcards = () => {
    setCurrentCardIndex(0);
    setIsFlipped(false);
  };

  // Flip Flashcard
  const flipCard = () => {
    setIsFlipped(!isFlipped);
  };

  // Next Flashcard
  const nextCard = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentCardIndex((prev) => (prev + 1) % flashcards.length);
    }, 150);
  };

  // Quiz Options click
  const selectOption = (quizIndex, option) => {
    if (quizSubmitted[quizIndex]) return;
    setQuizAnswers(prev => ({ ...prev, [quizIndex]: option }));
  };

  // Submit Quiz Question
  const submitQuizQuestion = (quizIndex, correctOption) => {
    if (quizSubmitted[quizIndex] || !quizAnswers[quizIndex]) return;

    const isCorrect = quizAnswers[quizIndex] === correctOption;
    if (isCorrect) {
      setQuizScore(prev => prev + 1);
    }
    
    setQuizSubmitted(prev => ({ ...prev, [quizIndex]: true }));
  };

  // Reset Quiz
  const resetQuiz = () => {
    setQuizAnswers({});
    setQuizSubmitted({});
    setQuizScore(0);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Tabs */}
      <div className="flex bg-slate-950 border-b border-slate-800 p-2 gap-2">
        <button
          onClick={() => setActiveTab('flashcards')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all ${activeTab === 'flashcards' ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30' : 'text-slate-400 hover:text-slate-200'}`}
        >
          <Layers size={16} />
          <span>Flashcards ({flashcards.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('quiz')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all ${activeTab === 'quiz' ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30' : 'text-slate-400 hover:text-slate-200'}`}
        >
          <HelpCircle size={16} />
          <span>Practice Quiz ({quizzes.length})</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {/* FLASHCARDS INTERFACE */}
        {activeTab === 'flashcards' && (
          <div className="h-full flex flex-col justify-between">
            {flashcards.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                <Layers size={40} className="mb-2 opacity-50" />
                <p>No flashcards generated yet</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-8 py-6">
                {/* 3D Flip Card */}
                <div 
                  onClick={flipCard}
                  className="w-full max-w-md h-64 cursor-pointer group"
                  style={{ perspective: '1000px' }}
                >
                  <div 
                    className={`relative w-full h-full duration-500 rounded-2xl border border-slate-700/60 shadow-xl transition-all transform`}
                    style={{ 
                      transformStyle: 'preserve-3d',
                      transform: isFlipped ? 'rotateY(180deg)' : 'none',
                    }}
                  >
                    {/* Front of Card */}
                    <div 
                      className="absolute inset-0 w-full h-full bg-slate-950 flex flex-col justify-between p-6 rounded-2xl"
                      style={{ backfaceVisibility: 'hidden' }}
                    >
                      <div className="flex justify-between items-center text-xs text-violet-400 font-bold uppercase tracking-wider">
                        <span>Active Recall</span>
                        <span>Card {currentCardIndex + 1} of {flashcards.length}</span>
                      </div>
                      <div className="flex-1 flex items-center justify-center text-center text-lg text-slate-100 font-medium px-4">
                        {flashcards[currentCardIndex].question}
                      </div>
                      <div className="text-center text-xs text-slate-500 italic">
                        Click card to flip
                      </div>
                    </div>

                    {/* Back of Card */}
                    <div 
                      className="absolute inset-0 w-full h-full bg-gradient-to-br from-violet-950/40 to-slate-950 flex flex-col justify-between p-6 rounded-2xl border border-violet-500/30"
                      style={{ 
                        backfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)'
                      }}
                    >
                      <div className="flex justify-between items-center text-xs text-emerald-400 font-bold uppercase tracking-wider">
                        <span>Core Concept Answer</span>
                        <span>Card {currentCardIndex + 1} of {flashcards.length}</span>
                      </div>
                      <div className="flex-1 flex items-center justify-center text-center text-md text-emerald-100 font-medium px-4">
                        {flashcards[currentCardIndex].answer}
                      </div>
                      <div className="text-center text-xs text-slate-500 italic">
                        Click card to flip back
                      </div>
                    </div>
                  </div>
                </div>

                {/* Deck Controls */}
                <div className="flex items-center gap-4">
                  <button
                    onClick={resetFlashcards}
                    className="p-2.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white transition-all hover:bg-slate-750"
                    title="Restart Deck"
                  >
                    <RotateCcw size={16} />
                  </button>
                  <button
                    onClick={nextCard}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-semibold transition-all hover:translate-x-0.5"
                  >
                    <span>Next Card</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* QUIZ INTERFACE */}
        {activeTab === 'quiz' && (
          <div className="h-full flex flex-col">
            {quizzes.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                <HelpCircle size={40} className="mb-2 opacity-50" />
                <p>No quiz questions generated yet</p>
              </div>
            ) : (
              <div className="flex flex-col gap-8 pb-12">
                {/* Score Banner */}
                <div className="flex items-center justify-between p-4 bg-indigo-950/30 border border-indigo-500/20 rounded-xl">
                  <div>
                    <h4 className="font-bold text-indigo-300">Practice Score</h4>
                    <p className="text-xs text-slate-400">Answer validation happens instantly</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-black text-indigo-400">
                      {quizScore} / {Object.keys(quizSubmitted).length || quizzes.length}
                    </span>
                    <button
                      onClick={resetQuiz}
                      className="p-2 rounded-lg bg-slate-850 hover:bg-slate-800 border border-slate-750 text-slate-300 hover:text-white transition-colors"
                      title="Reset Quiz"
                    >
                      <RotateCcw size={14} />
                    </button>
                  </div>
                </div>

                {/* Questions List */}
                {quizzes.map((qi, idx) => {
                  const isSubmitted = quizSubmitted[idx];
                  const selectedOpt = quizAnswers[idx];
                  const isCorrect = selectedOpt === qi.correctAnswer;
                  
                  return (
                    <div key={idx} className="flex flex-col gap-4 p-5 bg-slate-950/40 border border-slate-800 rounded-xl">
                      <div className="flex items-start gap-3">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-900/30 text-indigo-400 font-bold text-xs mt-0.5 border border-indigo-500/20">
                          {idx + 1}
                        </span>
                        <h4 className="font-semibold text-slate-100 leading-relaxed">
                          {qi.question}
                        </h4>
                      </div>

                      {/* Options Grid */}
                      <div className="flex flex-col gap-2.5 pl-9">
                        {qi.options.map((opt, oIdx) => {
                          const isSelected = selectedOpt === opt;
                          const isOptCorrect = opt === qi.correctAnswer;
                          
                          let btnClass = "border-slate-800 bg-slate-900/40 text-slate-300 hover:border-slate-700 hover:bg-slate-900/60";
                          
                          if (isSelected) {
                            btnClass = "border-indigo-500 bg-indigo-500/10 text-indigo-300";
                          }
                          
                          if (isSubmitted) {
                            if (isOptCorrect) {
                              btnClass = "border-emerald-500 bg-emerald-500/10 text-emerald-300";
                            } else if (isSelected) {
                              btnClass = "border-rose-500 bg-rose-500/10 text-rose-300";
                            } else {
                              btnClass = "border-slate-800 bg-slate-900/20 text-slate-500 opacity-60";
                            }
                          }

                          return (
                            <button
                              key={oIdx}
                              disabled={isSubmitted}
                              onClick={() => selectOption(idx, opt)}
                              className={`w-full flex items-center justify-between text-left p-3 rounded-lg border text-sm font-medium transition-all ${btnClass}`}
                            >
                              <span>{opt}</span>
                              {isSubmitted && isOptCorrect && (
                                <Check size={16} className="text-emerald-400" />
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Submit Action */}
                      {!isSubmitted && (
                        <div className="flex justify-end pr-3">
                          <button
                            disabled={!selectedOpt}
                            onClick={() => submitQuizQuestion(idx, qi.correctAnswer)}
                            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 disabled:opacity-40 text-white font-bold text-xs hover:bg-indigo-500 transition-colors"
                          >
                            <span>Validate Answer</span>
                          </button>
                        </div>
                      )}

                      {/* feedback banner */}
                      {isSubmitted && (
                        <div className={`flex items-center gap-2 mt-2 p-3 pl-9 rounded-lg border text-xs font-semibold ${isCorrect ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-400' : 'bg-rose-950/20 border-rose-500/20 text-rose-400'}`}>
                          {isCorrect ? (
                            <>
                              <CheckCircle2 size={14} />
                              <span>Correct Choice! Great job.</span>
                            </>
                          ) : (
                            <>
                              <XCircle size={14} />
                              <span>Incorrect. Correct answer was: <strong>{qi.correctAnswer}</strong></span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
