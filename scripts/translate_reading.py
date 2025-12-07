#!/usr/bin/env python3
"""Translate Chinese text in assets/json/reading.json to English, Spanish, and French via OpenAI."""

from __future__ import annotations

import asyncio
import json
import os
import re
import signal
import random
import shutil
import sys
from pathlib import Path
from typing import Dict, Iterable, List

from openai import APIError, AsyncOpenAI, RateLimitError

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "assets" / "json" / "reading.json"
TARGET = SOURCE.with_name("reading-en.json")
CACHE_FILE = SOURCE.with_name("reading-translations-cache.json")
LANGUAGES = ("en", "es", "fr")
Translations = Dict[str, str]
FIELDS_TO_TRANSLATE = [
    "title",
    "author",
    "publisher",
    "chapterTitle",
    "markText",
    "reviewText",
]
CHINESE_PATTERN = re.compile(r"[\u4e00-\u9fff]")


def needs_translation(text: str) -> bool:
    return bool(CHINESE_PATTERN.search(text))


async def translate_text(client: AsyncOpenAI, text: str) -> Translations:
    stripped = text.strip()
    if not stripped:
        return {lang: text for lang in LANGUAGES}
    if not needs_translation(text):
        return {lang: text for lang in LANGUAGES}

    max_retries = 5
    base_delay = 0.25

    for attempt in range(1, max_retries + 1):
        try:
            response = await client.chat.completions.create(
                model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "Translate the user's text to English (en), Spanish (es), "
                            "and French (fr). Respond ONLY with a compact JSON object "
                            "using keys en, es, fr. Example: "
                            '{"en": "...", "es": "...", "fr": "..."}'
                        ),
                    },
                    {"role": "user", "content": text},
                ],
                temperature=0,
                response_format={"type": "json_object"},
            )
            content = response.choices[0].message.content.strip()
            translations = json.loads(content)
            return {lang: str(translations.get(lang, text)) for lang in LANGUAGES}
        except (json.JSONDecodeError, AttributeError):
            # Treat as retryable parsing issue
            pass
        except (RateLimitError, APIError) as exc:
            status = getattr(exc, "status_code", None)
            if isinstance(exc, RateLimitError) or status == 429:
                if attempt == max_retries:
                    raise
                # Exponential backoff with jitter to respect rate limits
                delay = base_delay * (2 ** (attempt - 1)) + random.uniform(0, 0.25)
                await asyncio.sleep(delay)
                continue
            raise

        if attempt == max_retries:
            raise RuntimeError("Failed to parse translation response.")
        delay = base_delay * (2 ** (attempt - 1)) + random.uniform(0, 0.25)
        await asyncio.sleep(delay)


def progress_bar(progress: int, total: int) -> None:
    if total == 0:
        return
    width = 30
    filled = int(width * progress / total)
    bar = "#" * filled + "-" * (width - filled)
    print(f"\rTranslating [{bar}] {progress}/{total}", end="", file=sys.stderr, flush=True)
    if progress == total:
        print(file=sys.stderr)


def collect_translatables(data: Iterable[dict]) -> List[str]:
    seen = set()
    unique_texts: List[str] = []
    for item in data:
        for field in FIELDS_TO_TRANSLATE:
            value = item.get(field)
            if isinstance(value, str) and needs_translation(value) and value not in seen:
                seen.add(value)
                unique_texts.append(value)
    return unique_texts


def load_cache() -> Dict[str, Translations]:
    if not CACHE_FILE.exists():
        return {}
    try:
        raw = json.loads(CACHE_FILE.read_text(encoding="utf-8"))
        # Ensure only expected languages are kept
        sanitized: Dict[str, Translations] = {}
        for text, translations in raw.items():
            if isinstance(translations, dict):
                sanitized[text] = {
                    lang: str(translations.get(lang, ""))
                    for lang in LANGUAGES
                    if translations.get(lang) is not None
                }
        return sanitized
    except Exception:
        return {}


def save_cache(cache: Dict[str, Translations]) -> None:
    CACHE_FILE.write_text(
        json.dumps(cache, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


async def translate_all(
    client: AsyncOpenAI,
    texts: List[str],
    cache: Dict[str, Translations],
    concurrency: int = 10,
    stop_event: asyncio.Event | None = None,
) -> None:
    total = len(texts)
    if total == 0:
        return

    progress = 0
    progress_lock = asyncio.Lock()
    sem = asyncio.Semaphore(concurrency)
    cache_lock = asyncio.Lock()

    async def translate_one(text: str) -> None:
        nonlocal progress
        if stop_event and stop_event.is_set():
            raise asyncio.CancelledError
        if text in cache:
            async with progress_lock:
                progress += 1
                progress_bar(progress, total)
            return
        async with sem:
            if stop_event and stop_event.is_set():
                raise asyncio.CancelledError
            translations = await translate_text(client, text)
        async with cache_lock:
            cache[text] = translations
            save_cache(cache)
        async with progress_lock:
            progress += 1
            progress_bar(progress, total)

    await asyncio.gather(*(translate_one(text) for text in texts))


async def main() -> None:
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise EnvironmentError("Set OPENAI_API_KEY before running this script.")

    if not SOURCE.exists():
        raise FileNotFoundError(f"Source file not found: {SOURCE}")

    client = AsyncOpenAI(api_key=api_key)
    cache: Dict[str, Translations] = load_cache()
    try:
        concurrency = int(os.environ.get("TRANSLATE_CONCURRENCY", "10"))
    except ValueError:
        concurrency = 10
    concurrency = max(1, concurrency)
    stop_event = asyncio.Event()

    loop = asyncio.get_running_loop()
    if hasattr(signal, "SIGQUIT"):
        loop.add_signal_handler(signal.SIGQUIT, stop_event.set)

    data = json.loads(SOURCE.read_text(encoding="utf-8"))

    translatables = collect_translatables(data)
    translate_task = asyncio.create_task(
        translate_all(
            client,
            translatables,
            cache,
            concurrency=concurrency,
            stop_event=stop_event,
        )
    )
    stop_wait = asyncio.create_task(stop_event.wait())

    done, pending = await asyncio.wait(
        {translate_task, stop_wait},
        return_when=asyncio.FIRST_COMPLETED,
    )

    if stop_wait in done and not translate_task.done():
        translate_task.cancel()
        try:
            await translate_task
        except asyncio.CancelledError:
            print("\nTranslation aborted by signal.", file=sys.stderr)
            return
    else:
        stop_wait.cancel()
        try:
            await translate_task
        except asyncio.CancelledError:
            print("\nTranslation aborted by signal.", file=sys.stderr)
            return

    language_data = {lang: [] for lang in LANGUAGES}
    for item in data:
        for lang in LANGUAGES:
            new_item = dict(item)
            for field in FIELDS_TO_TRANSLATE:
                value = item.get(field)
                if isinstance(value, str) and needs_translation(value):
                    translations = cache.get(value)
                    if translations:
                        new_item[field] = translations.get(lang, value)
            language_data[lang].append(new_item)

    written_paths: List[Path] = []
    for lang, items in language_data.items():
        target = SOURCE.with_name(f"reading-{lang}.json")
        target.write_text(
            json.dumps(items, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        written_paths.append(target)

    save_cache(cache)
    if CACHE_FILE.exists():
        try:
            CACHE_FILE.unlink()
        except OSError:
            pass
    print("Wrote translated files:")
    for path in written_paths:
        print(f"  {path}")


if __name__ == "__main__":
    asyncio.run(main())
