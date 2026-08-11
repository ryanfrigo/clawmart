import { describe, expect, it } from "vitest";
import { audioFormatFromMime, pickRecorderMime } from "../src/components/voice/audio";
import { appendTranscript, cleanModelTranscript } from "../src/components/voice/transcript";
import {
  IDLE_STATE,
  UNSUPPORTED_STATE,
  isBusy,
  isCapturing,
  voiceReducer,
  type VoiceState,
} from "../src/components/voice/voice-state";

describe("appendTranscript", () => {
  it("returns the chunk when the field is empty", () => {
    expect(appendTranscript("", "a booking tool for barbers")).toBe(
      "a booking tool for barbers"
    );
  });

  it("appends after typed text with a single space", () => {
    expect(appendTranscript("A booking tool", "for barbers")).toBe(
      "A booking tool for barbers"
    );
  });

  it("never overwrites typed text", () => {
    const typed = "Something the user typed";
    expect(appendTranscript(typed, "dictated")).toContain(typed);
  });

  it("is a no-op for empty or whitespace-only chunks", () => {
    expect(appendTranscript("kept", "")).toBe("kept");
    expect(appendTranscript("kept", "   \n ")).toBe("kept");
  });

  it("does not double up whitespace the user already left", () => {
    expect(appendTranscript("half a sentence ", "finished")).toBe("half a sentence finished");
    expect(appendTranscript("line one\n", "line two")).toBe("line one\nline two");
  });

  it("hugs trailing punctuation instead of floating it", () => {
    expect(appendTranscript("done", ".")).toBe("done.");
    expect(appendTranscript("wait", ", then ship")).toBe("wait, then ship");
  });

  it("collapses whitespace inside the chunk", () => {
    expect(appendTranscript("", "  too   many\n spaces ")).toBe("too many spaces");
  });

  it("clamps to maxLength so the merge can't overflow the field", () => {
    expect(appendTranscript("12345", "6789", 8)).toBe("12345 67");
    // Clamping applies even when the chunk is dropped.
    expect(appendTranscript("123456789", "", 4)).toBe("1234");
  });

  it("leaves the value untouched when maxLength is already satisfied", () => {
    expect(appendTranscript("ab", "cd", 100)).toBe("ab cd");
  });
});

describe("cleanModelTranscript", () => {
  it("strips a Transcript: preamble", () => {
    expect(cleanModelTranscript("Transcript: hello there")).toBe("hello there");
    expect(cleanModelTranscript("transcription:  hello")).toBe("hello");
  });

  it("unwraps surrounding quotes", () => {
    expect(cleanModelTranscript('"hello there"')).toBe("hello there");
    expect(cleanModelTranscript("'hello there'")).toBe("hello there");
  });

  it("leaves internal quotes alone", () => {
    expect(cleanModelTranscript('he said "no" loudly')).toBe('he said "no" loudly');
  });

  it("does not invent content for an empty answer", () => {
    expect(cleanModelTranscript("   ")).toBe("");
  });
});

describe("audioFormatFromMime", () => {
  it("maps what Firefox's MediaRecorder produces", () => {
    expect(audioFormatFromMime("audio/ogg; codecs=opus")).toBe("ogg");
    expect(audioFormatFromMime("audio/ogg")).toBe("ogg");
  });

  it("maps the other containers OpenRouter accepts", () => {
    expect(audioFormatFromMime("audio/mp4")).toBe("m4a");
    expect(audioFormatFromMime("audio/x-m4a")).toBe("m4a");
    expect(audioFormatFromMime("audio/wav")).toBe("wav");
    expect(audioFormatFromMime("audio/mpeg")).toBe("mp3");
    expect(audioFormatFromMime("audio/flac")).toBe("flac");
    expect(audioFormatFromMime("AUDIO/OGG")).toBe("ogg");
  });

  it("rejects containers OpenRouter does not accept, including Chrome's webm", () => {
    expect(audioFormatFromMime("audio/webm;codecs=opus")).toBeNull();
    expect(audioFormatFromMime("video/mp4")).toBeNull();
    expect(audioFormatFromMime("")).toBeNull();
    expect(audioFormatFromMime("application/json")).toBeNull();
  });
});

describe("pickRecorderMime", () => {
  it("prefers ogg/opus when the browser offers it", () => {
    expect(pickRecorderMime(() => true)).toBe("audio/ogg;codecs=opus");
  });

  it("falls through to the next supported container", () => {
    expect(pickRecorderMime((m) => m === "audio/mp4")).toBe("audio/mp4");
  });

  it("returns null when nothing usable is supported", () => {
    expect(pickRecorderMime(() => false)).toBeNull();
  });

  it("never picks a container the server would reject", () => {
    const picked = pickRecorderMime(() => true);
    expect(picked).not.toBeNull();
    expect(audioFormatFromMime(picked as string)).not.toBeNull();
  });
});

describe("voiceReducer", () => {
  const listening: VoiceState = { phase: "listening", message: null };
  const requesting: VoiceState = { phase: "requesting", message: null };

  it("asks for permission before it claims to be listening", () => {
    expect(voiceReducer(IDLE_STATE, { type: "start" })).toEqual({
      phase: "requesting",
      message: null,
    });
    expect(voiceReducer(requesting, { type: "listening" })).toEqual(listening);
  });

  it("ignores a late onstart after the user already stopped", () => {
    expect(voiceReducer(IDLE_STATE, { type: "listening" })).toBe(IDLE_STATE);
  });

  it("ignores start while already capturing or uploading", () => {
    expect(voiceReducer(requesting, { type: "start" })).toBe(requesting);
    expect(voiceReducer(listening, { type: "start" })).toBe(listening);
    const transcribing: VoiceState = { phase: "transcribing", message: null };
    expect(voiceReducer(transcribing, { type: "start" })).toBe(transcribing);
  });

  it("lets the user retry after a denial", () => {
    const denied = voiceReducer(requesting, { type: "denied", message: "blocked" });
    expect(denied).toEqual({ phase: "denied", message: "blocked" });
    expect(voiceReducer(denied, { type: "start" })).toEqual({
      phase: "requesting",
      message: null,
    });
  });

  it("only enters transcribing from a live recording", () => {
    expect(voiceReducer(listening, { type: "uploading" })).toEqual({
      phase: "transcribing",
      message: null,
    });
    expect(voiceReducer(requesting, { type: "uploading" })).toBe(requesting);
  });

  it("settles back to idle but keeps a denial or error on screen", () => {
    expect(voiceReducer(listening, { type: "settle" })).toEqual(IDLE_STATE);
    const errored: VoiceState = { phase: "error", message: "boom" };
    expect(voiceReducer(errored, { type: "settle" })).toBe(errored);
    const denied: VoiceState = { phase: "denied", message: "blocked" };
    expect(voiceReducer(denied, { type: "settle" })).toBe(denied);
  });

  it("is a dead end once the browser is known to be unsupported", () => {
    for (const action of [
      { type: "start" },
      { type: "listening" },
      { type: "uploading" },
      { type: "settle" },
      { type: "denied", message: "x" },
      { type: "error", message: "x" },
    ] as const) {
      expect(voiceReducer(UNSUPPORTED_STATE, action)).toBe(UNSUPPORTED_STATE);
    }
  });

  it("classifies phases for aria-pressed and busy states", () => {
    expect(isCapturing("requesting")).toBe(true);
    expect(isCapturing("listening")).toBe(true);
    expect(isCapturing("transcribing")).toBe(false);
    expect(isBusy("transcribing")).toBe(true);
    expect(isBusy("idle")).toBe(false);
    expect(isBusy("unsupported")).toBe(false);
  });
});
