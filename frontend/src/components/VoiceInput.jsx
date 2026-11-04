import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

// Language used by the browser's speech recogniser for each app language.
// Languages Chrome cannot recognise yet use the closest one (Hindi / Urdu / Bengali).
const SPEECH_LANG = {
  en: 'en-IN', hi: 'hi-IN', mr: 'mr-IN', gu: 'gu-IN', bn: 'bn-IN', as: 'as-IN',
  kn: 'kn-IN', ml: 'ml-IN', ta: 'ta-IN', te: 'te-IN', pa: 'pa-IN', or: 'or-IN',
  ur: 'ur-IN', ne: 'ne-NP',
  brx: 'hi-IN', doi: 'hi-IN', kok: 'hi-IN', mai: 'hi-IN', sa: 'hi-IN', ks: 'ur-IN',
  sd: 'ur-IN', sat: 'hi-IN', mni: 'bn-IN',
};

// A text box with a microphone button. The spoken words are typed into the box.
//   value / onChange(text)  -> works like a normal controlled input
//   multiline               -> use a textarea (for descriptions)
//   append                  -> add the spoken words after the existing text
const VoiceInput = ({ value, onChange, multiline = false, append = false, ...inputProps }) => {
  const { t, i18n } = useTranslation();
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState('');
  const recognitionRef = useRef(null);

  const SpeechRecognition = typeof window !== 'undefined'
    ? (window.SpeechRecognition || window.webkitSpeechRecognition)
    : null;

  // Stop the microphone if the page is closed while listening
  useEffect(() => () => recognitionRef.current?.abort(), []);

  const startListening = () => {
    setMessage('');

    if (!SpeechRecognition) {
      setMessage(t('voice.notSupported'));
      return;
    }

    // Second click = stop
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const langCode = (i18n.resolvedLanguage || i18n.language || 'en').split('-')[0];
    const recognition = new SpeechRecognition();
    recognition.lang = SPEECH_LANG[langCode] || 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);

    recognition.onresult = (event) => {
      const spoken = event.results[0][0].transcript.trim().replace(/[.।]$/, '');
      if (!spoken) return;
      onChange(append && value ? `${value} ${spoken}` : spoken);
    };

    recognition.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setMessage(t('voice.micDenied'));
      } else if (event.error === 'no-speech') {
        setMessage(t('voice.noSpeech'));
      } else if (event.error !== 'aborted') {
        setMessage(t('voice.error'));
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setMessage(t('voice.error'));
    }
  };

  const Field = multiline ? 'textarea' : 'input';

  return (
    <div className="voice-field">
      <Field
        {...inputProps}
        className={multiline ? 'voice-textarea' : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        className={`voice-btn ${listening ? 'listening' : ''} ${multiline ? 'voice-btn-top' : ''}`}
        onClick={startListening}
        title={listening ? t('voice.stop') : t('voice.start')}
        aria-label={listening ? t('voice.stop') : t('voice.start')}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="2" width="6" height="12" rx="3" />
          <path d="M5 11a7 7 0 0 0 14 0" />
          <path d="M12 18v4" />
        </svg>
      </button>
      {listening && <div className="voice-status">{t('voice.listening')}</div>}
      {!listening && message && <div className="voice-status voice-status-error">{message}</div>}
    </div>
  );
};

export default VoiceInput;
