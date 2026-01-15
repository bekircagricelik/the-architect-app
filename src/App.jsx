import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, TrendingUp, Target, Zap, ChevronRight, Calendar, Sparkles, BookOpen, X, Plus, Mic, MicOff, ArrowRight, Check, User, Settings, Trash2, RefreshCw } from 'lucide-react';

// Simple localStorage-based storage
window.storage = {
  get: async (key) => {
    const value = localStorage.getItem(key);
    if (!value) throw new Error('Key not found');
    return { key, value };
  },
  set: async (key, value) => {
    localStorage.setItem(key, value);
    return { key, value };
  },
  delete: async (key) => {
    localStorage.removeItem(key);
    return { key, deleted: true };
  }
};

export default function ArchitectApp() {
  const [currentView, setCurrentView] = useState('loading');
  const [entries, setEntries] = useState([]);
  const [currentEntry, setCurrentEntry] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('mindset');
  const [isProcessing, setIsProcessing] = useState(false);
  const [architectResponse, setArchitectResponse] = useState('');
  const [userProfile, setUserProfile] = useState({
    totalEntries: 0,
    currentStreak: 0,
    patterns: [],
    goals: [],
    onboardingComplete: false,
    onboardingData: {}
  });
  const [showResponse, setShowResponse] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [conversationReply, setConversationReply] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState('');
  const [showVoiceConfirm, setShowVoiceConfirm] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const textareaRef = useRef(null);
  const recognitionRef = useRef(null);
  const [isListening, setIsListening] = useState(false);

  const [onboardingStep, setOnboardingStep] = useState(0);
  const [onboardingAnswers, setOnboardingAnswers] = useState({});
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [editedName, setEditedName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const categories = [
    { id: 'mindset', label: 'Mindset', icon: Sparkles },
    { id: 'business', label: 'Business', icon: TrendingUp },
    { id: 'habits', label: 'Habits', icon: Target },
    { id: 'decision', label: 'Decision', icon: Zap }
  ];

  const onboardingQuestions = [
    {
      id: 'name',
      question: "What should I call you?",
      placeholder: "Your name...",
      context: "I want to know who I'm speaking with."
    },
    {
      id: 'dissatisfaction',
      question: "What's the dull, persistent dissatisfaction you've learned to live with?",
      placeholder: "The thing you tolerate but secretly hate...",
      context: "Not the deep suffering, but what you've accepted as normal."
    },
    {
      id: 'complaint',
      question: "What do you complain about most, but never actually change?",
      placeholder: "That one thing you keep talking about...",
      context: "Your actions reveal what you actually want."
    },
    {
      id: 'five_years',
      question: "If nothing changes in 5 years, what does your average Tuesday look like?",
      placeholder: "Be brutally honest...",
      context: "This is your anti-vision. The life you're running from."
    },
    {
      id: 'ideal_life',
      question: "Forget practicality. What does your ideal Tuesday look like in 3 years?",
      placeholder: "What you actually want...",
      context: "This is your vision. Where you're headed."
    },
    {
      id: 'identity',
      question: "Complete this: 'I am the type of person who...'",
      placeholder: "Who are you becoming?",
      context: "This is the identity that makes your vision natural."
    },
    {
      id: 'biggest_goal',
      question: "What's the one thing that, if you achieved it this year, would change everything?",
      placeholder: "Your mission...",
      context: "This becomes your north star."
    }
  ];

useEffect(() => {
    loadData();
    initializeSpeechRecognition();
  }, []);

  const initializeSpeechRecognition = () => {
    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        return;
      }

      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      recognitionRef.current.maxAlternatives = 1;

      recognitionRef.current.onstart = () => {
        setRecordingStatus('🎤 Listening... Speak now');
      };

      recognitionRef.current.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          setVoiceTranscript(prev => prev + finalTranscript);
          setRecordingStatus('✓ Got it! Keep talking or stop.');
        } else if (interimTranscript) {
          setRecordingStatus('🎤 ' + interimTranscript);
        }
      };

      recognitionRef.current.onerror = (event) => {
        let errorMessage = 'Error: ';
        switch(event.error) {
          case 'not-allowed':
            errorMessage = '⚠️ Microphone access denied.';
            break;
          case 'no-speech':
            errorMessage = '⚠️ No speech detected.';
            break;
          case 'audio-capture':
            errorMessage = '⚠️ No microphone found.';
            break;
          case 'network':
            errorMessage = '⚠️ Network error.';
            break;
          default:
            errorMessage = '⚠️ ' + event.error;
        }
        
        setRecordingStatus(errorMessage);
        setTimeout(() => {
          setIsRecording(false);
          setIsListening(false);
          setRecordingStatus('');
        }, 3000);
      };

      recognitionRef.current.onend = () => {
        if (isListening) {
          try {
            recognitionRef.current.start();
          } catch (e) {
            setIsRecording(false);
            setIsListening(false);
            setRecordingStatus('');
          }
        } else {
          setIsRecording(false);
          setRecordingStatus('');
        }
      };
    } catch (error) {
      console.error('Failed to initialize speech recognition:', error);
    }
  };

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert('Voice input is not supported in your browser.');
        return;
      }
      initializeSpeechRecognition();
      setTimeout(() => toggleRecording(), 100);
      return;
    }

    if (isRecording) {
      setIsListening(false);
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.error('Error stopping recognition:', e);
      }
      setIsRecording(false);
      setRecordingStatus('');
      
      if (voiceTranscript.trim()) {
        distillVoiceEntry(voiceTranscript);
      }
    } else {
      setIsListening(true);
      setIsRecording(true);
      setVoiceTranscript('');
      setShowVoiceConfirm(false);
      setRecordingStatus('Starting...');
      try {
        recognitionRef.current.start();
      } catch (e) {
        setRecordingStatus('⚠️ Failed to start.');
        setIsRecording(false);
        setIsListening(false);
      }
    }
  };

  const distillVoiceEntry = async (rawTranscript) => {
    setRecordingStatus('✨ Distilling your thoughts...');
    
    const prompt = `You are The Architect's voice processor. A user just spoke their thoughts aloud, and you need to distill them into clear, written form.

Raw voice transcript:
"${rawTranscript}"

Your task:
1. Remove all filler words (um, uh, like, you know, etc.)
2. Fix grammar and sentence structure
3. Preserve the user's authentic voice and meaning
4. Make it read naturally as a journal entry
5. Keep it concise but complete
6. Do NOT add content that wasn't there - only clarify what was said

Return ONLY the distilled text, nothing else. No preamble, no "Here's the distilled version:", just the clean text.`;

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [
            { role: "user", content: prompt }
          ],
        })
      });

      const data = await response.json();
      const distilledText = data.content[0].text;
      
      setVoiceTranscript(distilledText);
      setShowVoiceConfirm(true);
      setRecordingStatus('');
    } catch (error) {
      console.error('Distillation failed:', error);
      setVoiceTranscript(rawTranscript);
      setShowVoiceConfirm(true);
      setRecordingStatus('');
    }
  };

  const confirmVoiceEntry = () => {
    setCurrentEntry(voiceTranscript);
    setShowVoiceConfirm(false);
    setVoiceTranscript('');
  };

  const refineVoiceEntry = () => {
    setCurrentEntry(voiceTranscript);
    setShowVoiceConfirm(false);
    setVoiceTranscript('');
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  const loadData = async () => {
    try {
      const entriesData = await window.storage.get('architect_entries');
      const profileData = await window.storage.get('architect_profile');
      
      if (entriesData) {
        setEntries(JSON.parse(entriesData.value));
      }
      if (profileData) {
        const profile = JSON.parse(profileData.value);
        const loadedEntries = entriesData ? JSON.parse(entriesData.value) : [];
        profile.currentStreak = calculateStreak(loadedEntries);
        setUserProfile(profile);
        setCurrentView(profile.onboardingComplete ? 'home' : 'onboarding');
      } else {
        setCurrentView('onboarding');
      }
    } catch (error) {
      setCurrentView('onboarding');
    }
  };

  const saveData = async (newEntries, newProfile) => {
    try {
      await window.storage.set('architect_entries', JSON.stringify(newEntries));
      await window.storage.set('architect_profile', JSON.stringify(newProfile));
    } catch (error) {
      console.error('Save failed:', error);
    }
  };

const calculateStreak = (entries) => {
    if (entries.length === 0) return 0;
    
    const uniqueDates = [...new Set(entries.map(e => e.date))].sort((a, b) => {
      return new Date(b) - new Date(a);
    });
    
    if (uniqueDates.length === 0) return 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const mostRecentEntry = new Date(uniqueDates[0]);
    mostRecentEntry.setHours(0, 0, 0, 0);
    
    if (mostRecentEntry.getTime() !== today.getTime() && 
        mostRecentEntry.getTime() !== yesterday.getTime()) {
      return 0;
    }
    
    let streak = 1;
    let currentDate = new Date(mostRecentEntry);
    
    for (let i = 1; i < uniqueDates.length; i++) {
      const prevDate = new Date(uniqueDates[i]);
      prevDate.setHours(0, 0, 0, 0);
      
      const expectedDate = new Date(currentDate);
      expectedDate.setDate(expectedDate.getDate() - 1);
      
      if (prevDate.getTime() === expectedDate.getTime()) {
        streak++;
        currentDate = prevDate;
      } else {
        break;
      }
    }
    
    return streak;
  };

  const getArchitectResponse = async (entryText, category, pastEntries, profileData) => {
    const contextSummary = pastEntries.slice(0, 5).map(e => 
      `[${e.category}] ${e.text.substring(0, 100)}...`
    ).join('\n');

    const onboardingContext = profileData.onboardingComplete ? `
User's Name: ${profileData.onboardingData.name || 'Unknown'}
User's Foundation:
- What they're running from: ${profileData.onboardingData.five_years || 'Unknown'}
- Where they're headed: ${profileData.onboardingData.ideal_life || 'Unknown'}
- Their identity: ${profileData.onboardingData.identity || 'Unknown'}
- Primary goal: ${profileData.onboardingData.biggest_goal || 'Unknown'}
- Main complaint: ${profileData.onboardingData.complaint || 'Unknown'}

IMPORTANT: Use their name naturally in your response when appropriate. Don't overuse it, but use it like you would with a close friend.
` : '';

    const prompt = `You are "The Architect" - a mentor who embodies both the wisdom of a stoic Taoist master and the practical insight of a fulfilled multi-billionaire. You've achieved everything and now your sole purpose is helping others build extraordinary lives.

Your philosophy is rooted in these principles:
1. Identity-first change: People aren't where they want to be because they aren't the person who would be there yet
2. All behavior is goal-oriented: Even self-sabotage serves a hidden goal (usually safety, approval, or avoiding judgment)
3. Anti-vision drives action: The life you're running FROM is often more motivating than the life you're running TO
4. True intelligence is iteration: The ability to act, sense, compare, and persist through feedback
5. Enjoyment is found in becoming: Not in achievement, but in the process of transformation

${onboardingContext}

Context from recent entries:
${contextSummary || 'This is their first entry.'}

Current entry (${category}):
"${entryText}"

Respond as The Architect:
- Acknowledge what they shared with penetrating insight
- If you detect self-sabotage or identity protection, name it directly but kindly
- Ask 1-2 Socratic questions that reveal their true motives or hidden goals
- If they're stuck in an old pattern, help them see what identity they're protecting
- If they're making progress, reinforce the identity shift happening
- Be direct but never harsh. Wise but never preachy. You've been there.

Keep response under 150 words. Write like you're texting a friend you deeply care about.`;

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [
            { role: "user", content: prompt }
          ],
        })
      });

      const data = await response.json();
      return data.content[0].text;
    } catch (error) {
      console.error('Architect response failed:', error);
      return "I'm here with you. What matters most about what you just shared?";
    }
  };

  const handleSubmitEntry = async () => {
    if (!currentEntry.trim()) return;

    setIsProcessing(true);
    setShowResponse(false);

    const newEntry = {
      id: Date.now(),
      text: currentEntry,
      category: selectedCategory,
      timestamp: new Date().toISOString(),
      date: new Date().toLocaleDateString()
    };

    const response = await getArchitectResponse(currentEntry, selectedCategory, entries, userProfile);

    const updatedEntries = [newEntry, ...entries];
    const newStreak = calculateStreak(updatedEntries);

    const updatedProfile = {
      ...userProfile,
      totalEntries: userProfile.totalEntries + 1,
      currentStreak: newStreak
    };

    setConversationHistory([
      { role: 'user', content: currentEntry, category: selectedCategory },
      { role: 'architect', content: response }
    ]);

    setEntries(updatedEntries);
    setUserProfile(updatedProfile);
    setArchitectResponse(response);
    setShowResponse(true);
    setIsProcessing(false);
    
    await saveData(updatedEntries, updatedProfile);
  };

  const handleConversationReply = async () => {
    if (!conversationReply.trim()) return;

    setIsProcessing(true);

    const conversationContext = conversationHistory.map(msg => {
      if (msg.role === 'user') {
        return `User: ${msg.content}`;
      } else {
        return `Architect: ${msg.content}`;
      }
    }).join('\n\n');

    const onboardingContext = userProfile.onboardingComplete ? `
User's Name: ${userProfile.onboardingData.name || 'Unknown'}
User's Foundation:
- What they're running from: ${userProfile.onboardingData.five_years || 'Unknown'}
- Where they're headed: ${userProfile.onboardingData.ideal_life || 'Unknown'}
- Their identity: ${userProfile.onboardingData.identity || 'Unknown'}
- Primary goal: ${userProfile.onboardingData.biggest_goal || 'Unknown'}

IMPORTANT: Use their name naturally when appropriate, like you would with a close friend.
` : '';

    const prompt = `You are "The Architect" - a mentor who embodies both the wisdom of a stoic Taoist master and the practical insight of a fulfilled multi-billionaire.

${onboardingContext}

Conversation so far:
${conversationContext}

User's latest response:
${conversationReply}

The user has chosen to continue the dialogue. This means:
1. Your previous question landed, and they're thinking deeper
2. They may be resisting a truth, or
3. They genuinely need more clarity

Your response should:
- Go one layer deeper with your questioning
- If they're deflecting or making excuses, call it out gently but directly
- If they're genuinely exploring, guide them to their own insight
- CRITICAL: Frame questions that lead them to answer their own question.
- Keep it under 100 words - brevity creates impact

Remember: The goal is self-discovery, not advice-giving.`;

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [
            { role: "user", content: prompt }
          ],
        })
      });

      const data = await response.json();
      const newResponse = data.content[0].text;

      const updatedHistory = [
        ...conversationHistory,
        { role: 'user', content: conversationReply },
        { role: 'architect', content: newResponse }
      ];

      setConversationHistory(updatedHistory);
      setArchitectResponse(newResponse);
      setConversationReply('');
      setIsProcessing(false);
    } catch (error) {
      console.error('Conversation reply failed:', error);
      setIsProcessing(false);
    }
  };

  const handleOnboardingNext = () => {
    if (!currentAnswer.trim()) return;

    const newAnswers = {
      ...onboardingAnswers,
      [onboardingQuestions[onboardingStep].id]: currentAnswer
    };
    setOnboardingAnswers(newAnswers);
    setCurrentAnswer('');

    if (onboardingStep < onboardingQuestions.length - 1) {
      setOnboardingStep(onboardingStep + 1);
    } else {
      completeOnboarding(newAnswers);
    }
  };

  const completeOnboarding = async (answers) => {
    const updatedProfile = {
      ...userProfile,
      onboardingComplete: true,
      onboardingData: answers
    };
    
    setUserProfile(updatedProfile);
    await window.storage.set('architect_profile', JSON.stringify(updatedProfile));
    setCurrentView('home');
  };

  const startNewEntry = () => {
    setCurrentEntry('');
    setArchitectResponse('');
    setShowResponse(false);
    setConversationHistory([]);
    setConversationReply('');
    setIsRecording(false);
    setIsListening(false);
    setRecordingStatus('');
    setShowVoiceConfirm(false);
    setVoiceTranscript('');
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
    }
    setCurrentView('journal');
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  const handleUpdateName = async () => {
    if (!editedName.trim()) return;
    
    const updatedProfile = {
      ...userProfile,
      onboardingData: {
        ...userProfile.onboardingData,
        name: editedName
      }
    };
    
    setUserProfile(updatedProfile);
    await window.storage.set('architect_profile', JSON.stringify(updatedProfile));
    setEditedName('');
    alert('Name updated successfully!');
  };

  const handleResetProfile = async () => {
    try {
      await window.storage.delete('architect_profile');
      setUserProfile({
        totalEntries: 0,
        currentStreak: 0,
        patterns: [],
        goals: [],
        onboardingComplete: false,
        onboardingData: {}
      });
      setOnboardingStep(0);
      setOnboardingAnswers({});
      setShowResetConfirm(false);
      setCurrentView('onboarding');
    } catch (error) {
      console.error('Reset failed:', error);
      alert('Failed to reset profile. Please try again.');
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await window.storage.delete('architect_profile');
      await window.storage.delete('architect_entries');
      setUserProfile({
        totalEntries: 0,
        currentStreak: 0,
        patterns: [],
        goals: [],
        onboardingComplete: false,
        onboardingData: {}
      });
      setEntries([]);
      setOnboardingStep(0);
      setOnboardingAnswers({});
      setShowDeleteConfirm(false);
      setCurrentView('onboarding');
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete account. Please try again.');
    }
  };

// ONBOARDING VIEW
  if (currentView === 'onboarding') {
    const question = onboardingQuestions[onboardingStep];
    const progress = ((onboardingStep + 1) / onboardingQuestions.length) * 100;

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-4">
        <div className="max-w-2xl mx-auto pt-12">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center">
                <Sparkles className="w-7 h-7" />
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                The Architect
              </h1>
            </div>
            <p className="text-slate-400 text-lg mb-8">Let me understand where you are, so I can help you get where you want to be.</p>
            
            <div className="w-full bg-slate-800 rounded-full h-2 mb-2">
              <div 
                className="bg-gradient-to-r from-cyan-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-slate-500 text-sm">Question {onboardingStep + 1} of {onboardingQuestions.length}</p>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 mb-6">
            <h2 className="text-2xl font-semibold text-white mb-3">{question.question}</h2>
            <p className="text-slate-400 text-sm mb-6">{question.context}</p>
            
            <textarea
              value={currentAnswer}
              onChange={(e) => setCurrentAnswer(e.target.value)}
              placeholder={question.placeholder}
              className="w-full h-40 bg-slate-900/50 border border-slate-600 rounded-lg p-4 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 resize-none mb-4"
              autoFocus
            />

            <button
              onClick={handleOnboardingNext}
              disabled={!currentAnswer.trim()}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              {onboardingStep < onboardingQuestions.length - 1 ? (
                <>
                  Next Question <ArrowRight className="w-5 h-5" />
                </>
              ) : (
                <>
                  Complete Setup <Check className="w-5 h-5" />
                </>
              )}
            </button>
          </div>

          <p className="text-center text-slate-500 text-sm">
            Your answers help The Architect understand your journey and provide better guidance.
          </p>
        </div>
      </div>
    );
  }

  // HOME VIEW
  if (currentView === 'home') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-4">
        <div className="max-w-4xl mx-auto">
          <div className="pt-12 pb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1" />
              <div className="flex items-center justify-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-7 h-7" />
                </div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                  The Architect
                </h1>
              </div>
              <div className="flex-1 flex justify-end">
                <button
                  onClick={() => setCurrentView('profile')}
                  className="p-3 bg-slate-800/50 hover:bg-slate-700 border border-slate-700 hover:border-cyan-500 rounded-xl transition-all"
                  title="Profile Settings"
                >
                  <Settings className="w-6 h-6 text-slate-400 hover:text-cyan-400" />
                </button>
              </div>
            </div>
            <p className="text-slate-400 text-lg text-center">Your High Agency Mentor</p>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-cyan-400">{userProfile.totalEntries}</div>
              <div className="text-slate-400 text-sm mt-1">Entries</div>
            </div>
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-blue-400">{userProfile.currentStreak}</div>
              <div className="text-slate-400 text-sm mt-1">Day Streak</div>
            </div>
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-purple-400">
                {new Set(entries.map(e => e.date)).size}
              </div>
              <div className="text-slate-400 text-sm mt-1">Days Active</div>
            </div>
          </div>

          <button
            onClick={startNewEntry}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold py-6 rounded-xl flex items-center justify-center gap-3 mb-6 transition-all transform hover:scale-[1.02] shadow-lg shadow-cyan-500/20"
          >
            <Plus className="w-6 h-6" />
            New Journal Entry
          </button>

          {entries.length > 0 && (
            <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-cyan-400" />
                  Recent Entries
                </h2>
                <button
                  onClick={() => setCurrentView('history')}
                  className="text-cyan-400 text-sm hover:text-cyan-300 flex items-center gap-1"
                >
                  View All <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-3">
                {entries.slice(0, 3).map(entry => {
                  const categoryInfo = categories.find(c => c.id === entry.category);
                  const Icon = categoryInfo?.icon || MessageCircle;
                  return (
                    <div key={entry.id} className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className="w-4 h-4 text-cyan-400" />
                        <span className="text-xs text-cyan-400 font-medium uppercase">{entry.category}</span>
                        <span className="text-xs text-slate-500 ml-auto">{entry.date}</span>
                      </div>
                      <p className="text-slate-300 text-sm line-clamp-2">{entry.text}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {entries.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <Sparkles className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-2">Your journey begins here</p>
              <p className="text-sm">Start your first journal entry and let The Architect guide you.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // PROFILE VIEW
  if (currentView === 'profile') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-4">
        <div className="max-w-3xl mx-auto pt-8">
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => setCurrentView('home')}
              className="text-slate-400 hover:text-white flex items-center gap-2"
            >
              <X className="w-5 h-5" />
              Back
            </button>
            <h2 className="text-2xl font-bold">Profile Settings</h2>
            <div className="w-20" />
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-full flex items-center justify-center">
                <User className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">{userProfile.onboardingData?.name || 'User'}</h3>
                <p className="text-slate-400 text-sm">{userProfile.totalEntries} entries · {userProfile.currentStreak} day streak</p>
              </div>
            </div>

            <div className="mb-6">
              <label className="text-slate-400 text-sm mb-2 block">Update your name</label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  placeholder={userProfile.onboardingData?.name || 'Your name'}
                  className="flex-1 bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                />
                <button
                  onClick={handleUpdateName}
                  disabled={!editedName.trim()}
                  className="bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-lg transition-all"
                >
                  Update
                </button>
              </div>
            </div>

            <div className="border-t border-slate-700 pt-4">
              <h4 className="text-sm font-semibold text-slate-400 mb-3">Your Foundation</h4>
              <div className="space-y-2 text-sm">
                <p className="text-slate-300">
                  <span className="text-slate-500">Anti-Vision:</span> {userProfile.onboardingData?.five_years?.substring(0, 80)}...
                </p>
                <p className="text-slate-300">
                  <span className="text-slate-500">Vision:</span> {userProfile.onboardingData?.ideal_life?.substring(0, 80)}...
                </p>
                <p className="text-slate-300">
                  <span className="text-slate-500">Primary Goal:</span> {userProfile.onboardingData?.biggest_goal}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 border border-red-900/50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-red-400 mb-4 flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Danger Zone
            </h3>

            <div className="mb-4 pb-4 border-b border-slate-700">
              <h4 className="font-medium mb-2">Reset Profile</h4>
              <p className="text-slate-400 text-sm mb-3">
                Clear your onboarding answers and start fresh. Your journal entries will be kept.
              </p>
              {!showResetConfirm ? (
                <button
                  onClick={() => setShowResetConfirm(true)}
                  className="bg-slate-700 hover:bg-slate-600 text-white font-semibold px-4 py-2 rounded-lg transition-all flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reset Profile
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleResetProfile}
                    className="bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-lg transition-all"
                  >
                    Confirm Reset
                  </button>
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="bg-slate-700 hover:bg-slate-600 text-white font-semibold px-4 py-2 rounded-lg transition-all"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            <div>
              <h4 className="font-medium mb-2 text-red-400">Delete Account</h4>
              <p className="text-slate-400 text-sm mb-3">
                Permanently delete all your data including entries and profile. This cannot be undone.
              </p>
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="bg-red-900/50 hover:bg-red-900 text-red-400 hover:text-white font-semibold px-4 py-2 rounded-lg transition-all flex items-center gap-2 border border-red-900"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Account
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleDeleteAccount}
                    className="bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-lg transition-all"
                  >
                    Permanently Delete
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="bg-slate-700 hover:bg-slate-600 text-white font-semibold px-4 py-2 rounded-lg transition-all"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

// JOURNAL VIEW
  if (currentView === 'journal') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-4">
        <div className="max-w-3xl mx-auto pt-8">
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => setCurrentView('home')}
              className="text-slate-400 hover:text-white flex items-center gap-2"
            >
              <X className="w-5 h-5" />
              Close
            </button>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-cyan-400" />
              <span className="text-slate-400">{new Date().toLocaleDateString()}</span>
            </div>
          </div>

          {!showResponse ? (
            <>
              {showVoiceConfirm && (
                <div className="mb-6 bg-gradient-to-br from-purple-900/30 to-blue-900/30 border border-purple-700/50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-purple-300 mb-3">
                    I've distilled your thoughts. Confirm or refine.
                  </h3>
                  <div className="bg-slate-900/50 rounded-lg p-4 mb-4 max-h-40 overflow-y-auto">
                    <p className="text-slate-300 whitespace-pre-wrap">{voiceTranscript}</p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={confirmVoiceEntry}
                      className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold py-3 rounded-lg transition-all"
                    >
                      Confirm & Submit
                    </button>
                    <button
                      onClick={refineVoiceEntry}
                      className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-lg transition-all"
                    >
                      Refine
                    </button>
                  </div>
                </div>
              )}

              <div className="mb-6">
                <label className="text-slate-400 text-sm mb-3 block">What's on your mind?</label>
                <div className="grid grid-cols-2 gap-3">
                  {categories.map(cat => {
                    const Icon = cat.icon;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${
                          selectedCategory === cat.id
                            ? 'border-cyan-500 bg-cyan-500/10'
                            : 'border-slate-700 bg-slate-800/30 hover:border-slate-600'
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${selectedCategory === cat.id ? 'text-cyan-400' : 'text-slate-400'}`} />
                        <span className={selectedCategory === cat.id ? 'text-white font-medium' : 'text-slate-400'}>
                          {cat.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-slate-400 text-sm">Your entry</label>
                  <button
                    onClick={toggleRecording}
                    disabled={isProcessing}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                      isRecording
                        ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                        : 'bg-cyan-500 hover:bg-cyan-600 text-white'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {isRecording ? (
                      <>
                        <MicOff className="w-4 h-4" />
                        Stop
                      </>
                    ) : (
                      <>
                        <Mic className="w-4 h-4" />
                        Voice
                      </>
                    )}
                  </button>
                </div>
                
                {recordingStatus && (
                  <div className="mb-3 text-center">
                    <div className="inline-flex items-center gap-2 bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-2 rounded-lg">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                      <span className="text-sm">{recordingStatus}</span>
                    </div>
                  </div>
                )}
                
                <textarea
                  ref={textareaRef}
                  value={currentEntry}
                  onChange={(e) => setCurrentEntry(e.target.value)}
                  placeholder="Write what's on your mind... The Architect is listening."
                  className="w-full h-64 bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 resize-none"
                  disabled={isProcessing}
                />
              </div>

              <button
                onClick={handleSubmitEntry}
                disabled={!currentEntry.trim() || isProcessing}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl transition-all transform hover:scale-[1.02] disabled:scale-100 shadow-lg shadow-cyan-500/20"
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    The Architect is thinking...
                  </span>
                ) : (
                  'Submit to The Architect'
                )}
              </button>
            </>
          ) : (
            <>
              <div className="space-y-4 mb-6">
                {conversationHistory.map((msg, idx) => {
                  if (msg.role === 'user') {
                    return (
                      <div key={idx} className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                        {idx === 0 && (
                          <div className="flex items-center gap-2 mb-3">
                            {React.createElement(categories.find(c => c.id === msg.category)?.icon || MessageCircle, {
                              className: "w-5 h-5 text-cyan-400"
                            })}
                            <span className="text-cyan-400 font-medium uppercase text-sm">{msg.category}</span>
                          </div>
                        )}
                        <p className="text-slate-300 whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    );
                  } else {
                    return (
                      <div key={idx} className="bg-gradient-to-br from-cyan-900/20 to-blue-900/20 border border-cyan-700/50 rounded-xl p-6">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center">
                            <Sparkles className="w-5 h-5" />
                          </div>
                          <span className="text-cyan-400 font-semibold">The Architect</span>
                        </div>
                        <p className="text-white leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    );
                  }
                })}
              </div>

              <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-6 mb-4">
                <label className="text-slate-400 text-sm mb-3 block">Continue the conversation (optional)</label>
                <textarea
                  value={conversationReply}
                  onChange={(e) => setConversationReply(e.target.value)}
                  placeholder="Your response to The Architect..."
                  className="w-full h-32 bg-slate-900/50 border border-slate-600 rounded-lg p-4 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 resize-none mb-3"
                  disabled={isProcessing}
                />
                <button
                  onClick={handleConversationReply}
                  disabled={!conversationReply.trim() || isProcessing}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-400 hover:to-pink-500 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-all"
                >
                  {isProcessing ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Thinking...
                    </span>
                  ) : (
                    'Reply to The Architect'
                  )}
                </button>
              </div>

              <button
                onClick={startNewEntry}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold py-4 rounded-xl transition-all transform hover:scale-[1.02] shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                New Entry
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // HISTORY VIEW
  if (currentView === 'history') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-4">
        <div className="max-w-4xl mx-auto pt-8">
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => setCurrentView('home')}
              className="text-slate-400 hover:text-white flex items-center gap-2"
            >
              <X className="w-5 h-5" />
              Back
            </button>
            <h2 className="text-2xl font-bold">Your Journey</h2>
            <div className="w-20" />
          </div>

          <div className="space-y-4">
            {entries.map(entry => {
              const categoryInfo = categories.find(c => c.id === entry.category);
              const Icon = categoryInfo?.icon || MessageCircle;
              return (
                <div key={entry.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className="w-5 h-5 text-cyan-400" />
                    <span className="text-cyan-400 font-medium uppercase text-sm">{entry.category}</span>
                    <span className="text-slate-500 text-sm ml-auto">{entry.date}</span>
                  </div>
                  <p className="text-slate-300 whitespace-pre-wrap">{entry.text}</p>
                </div>
              );
            })}
          </div>

          {entries.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>No entries yet. Start journaling to see your history.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
