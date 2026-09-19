export function cleanSpeech(text) {
  return String(text || "")
    .replace(/[*_`#]/g, "")
    .replace(/[—–]/g, "-")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

export function chooseVoice() {
  const voices = window.speechSynthesis?.getVoices?.() || [];
  return voices.find(v => /Microsoft.*(Aria|Jenny|Guy|Ryan|Sonia|Libby)/i.test(v.name))
    || voices.find(v => /Google.*English/i.test(v.name))
    || voices.find(v => /^en[-_]/i.test(v.lang))
    || voices[0];
}
