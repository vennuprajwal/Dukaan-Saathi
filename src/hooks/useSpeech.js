import { useRef, useState, useCallback, useEffect } from "react";

/* Browser speech recognition (Web Speech API) with live interim captions.
   Available in Chrome/Edge (and Safari as webkitSpeechRecognition). When it is
   not supported, `supported` is false and the caller falls back to recording +
   Sarvam server-side transcription.

   BCP-47 locale is derived from the app's current language so the shopkeeper is
   understood in the language they actually speak. */
const LOCALE = { en: "en-IN", hi: "hi-IN", te: "te-IN" };

function getRecognition() {
  const Ctor =
    typeof window !== "undefined" &&
    (window.SpeechRecognition || window.webkitSpeechRecognition);
  return Ctor ? new Ctor() : null;
}

export function useSpeech(lang = "en") {
  const supported =
    typeof window !== "undefined" &&
    Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const recRef = useRef(null);
  const resolveRef = useRef(null);
  const finalRef = useRef("");

  const stop = useCallback(() => {
    try {
      recRef.current?.stop();
    } catch {
      /* already stopped */
    }
  }, []);

  /* Start listening; resolves with the final transcript when recognition ends
     (either the user stopped it or a natural pause). Rejects on error. */
  const start = useCallback(
    () =>
      new Promise((resolve, reject) => {
        const rec = getRecognition();
        if (!rec) {
          reject(new Error("unsupported"));
          return;
        }
        rec.lang = LOCALE[lang] || "en-IN";
        rec.interimResults = true;
        rec.continuous = false;
        rec.maxAlternatives = 1;
        finalRef.current = "";
        resolveRef.current = resolve;

        rec.onresult = (e) => {
          let interimText = "";
          let finalText = "";
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const chunk = e.results[i][0].transcript;
            if (e.results[i].isFinal) finalText += chunk;
            else interimText += chunk;
          }
          if (finalText) finalRef.current += finalText;
          setInterim(interimText);
        };
        rec.onerror = (e) => {
          setListening(false);
          setInterim("");
          // "no-speech"/"aborted" are benign — resolve with whatever we have.
          if (e.error === "no-speech" || e.error === "aborted") {
            resolve(finalRef.current.trim());
          } else {
            reject(new Error(e.error || "speech-error"));
          }
        };
        rec.onend = () => {
          setListening(false);
          setInterim("");
          if (resolveRef.current) {
            resolveRef.current(finalRef.current.trim());
            resolveRef.current = null;
          }
        };

        recRef.current = rec;
        try {
          rec.start();
          setListening(true);
        } catch (err) {
          reject(err);
        }
      }),
    [lang],
  );

  useEffect(() => () => stop(), [stop]);

  return { supported, listening, interim, start, stop };
}
