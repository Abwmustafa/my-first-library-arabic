# Voice credits

The spoken words (one mp3 per page in each book's folder) were made with:

- **SILMA TTS** by SILMA AI, an open Arabic text-to-speech model: https://huggingface.co/silma-ai/silma-tts
  - Model weights: Apache License 2.0. Code: MIT License.
  - The voice is the reference sample that comes with the model.
- **Whisper large-v3-turbo** by OpenAI (MIT License), used only to check each recording by writing down what it hears.

They were made by `tools/make_voice.py` in the book project. Any page here can be replaced by a parent's own recording with `tools/split_recording.py`.
