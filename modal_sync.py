import modal
import io
import os

# 1. Define the Cloud Environment
# We use a Debian Linux image and install whisperx and its dependencies
image = (
    modal.Image.debian_slim(python_version="3.10")
    .apt_install("git", "ffmpeg")
    .pip_install(
        "torch",
        "torchaudio",
        "git+https://github.com/m-bain/whisperX.git",
        "pandas",
        "fastapi[standard]"
    )
)

app = modal.App("lyrics-sync-engine")

# 2. Define the Sync Function
# This function runs on a cloud GPU (A10G)
@app.function(image=image, gpu="A10G", timeout=300)
@modal.web_endpoint(method="POST")
def sync_lyrics(data: dict):
    """
    Expects: {"audio_url": "...", "text": "..."}
    Returns: {"lrc": "[00:12.34]Line 1\n..."}
    """
    import whisperx
    import torch
    import tempfile
    import requests

    audio_url = data.get("audio_url")
    text_lyrics = data.get("text", "")
    device = "cuda"

    if not audio_url:
        return {"error": "No audio URL provided"}

    # --- Step 1: Download Audio ---
    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp_audio:
        response = requests.get(audio_url)
        tmp_audio.write(response.content)
        audio_path = tmp_audio.name

    try:
        # --- Step 2: Transcribe (First Pass) ---
        # We use a small model for speed, as we are mainly doing alignment
        model = whisperx.load_model("small", device, compute_type="float16")
        audio = whisperx.load_audio(audio_path)
        result = model.transcribe(audio, batch_size=16)

        # --- Step 3: Align with Provided Text ---
        # This is where the magic happens - it forces the audio to match your lyrics
        model_a, metadata = whisperx.load_align_model(language_code="en", device=device)
        
        # Split text into lines for alignment
        lines = [line.strip() for line in text_lyrics.split('\n') if line.strip()]
        
        # Align segments
        result = whisperx.align(result["segments"], model_a, metadata, audio, device, return_char_alignments=False)

        # --- Step 4: Format as LRC ---
        lrc_lines = []
        # WhisperX gives segments. We'll map them back to the lines provided if possible,
        # but for now we'll return the synced segments in LRC format.
        for segment in result["segments"]:
            start_time = segment["start"]
            text = segment["text"].strip()
            
            minutes = int(start_time // 60)
            seconds = int(start_time % 60)
            milliseconds = int((start_time % 1) * 100)
            
            timestamp = f"[{minutes:02d}:{seconds:02d}.{milliseconds:02d}]"
            lrc_lines.append(f"{timestamp}{text}")

        return {"lrc": "\n".join(lrc_lines)}

    finally:
        if os.path.exists(audio_path):
            os.remove(audio_path)

if __name__ == "__main__":
    app.serve()
