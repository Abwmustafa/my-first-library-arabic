# صِغَارُ الضَّاد: سِلْسِلَةُ كُتُبِ الْأَطْفَال

The web version of 20 Arabic board books for ages 1–3, in two sets of 10. Open the site, tap a book, and turn the pages with the arrows, the arrow keys, or a swipe. Tap an animal, an instrument or a toy to hear it. Tap a word, or the speaker button, to hear the word said (this uses the device's Arabic voice, or the author's own recordings where there are some).

The books are made in the main project with `build.py`. This folder is written by `tools/web_book.py`, so don't edit it by hand: change `content.py` or a photo there, then run `python build.py` and `python tools/web_book.py` again.

- Photos: AI-generated (RealVisXL V5.0 Lightning, Z-Image-Turbo, and Canva's image generator), cut out with BiRefNet.
- Fonts: Noto Naskh Arabic and Noto Sans, SIL Open Font License.
- Sounds: real recordings from BigSoundBank.com and Wikimedia Commons, under free licences. See [sounds/CREDITS.md](sounds/CREDITS.md).
