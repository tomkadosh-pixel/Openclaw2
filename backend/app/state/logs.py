from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from datetime import datetime
from typing import Deque, List


@dataclass
class LogEntry:
    level: str
    message: str
    context: str | None = None
    timestamp: datetime = field(default_factory=datetime.utcnow)


class LogStore:
    def __init__(self, max_entries: int = 200) -> None:
        self._entries: Deque[LogEntry] = deque(maxlen=max_entries)

    def push(self, level: str, message: str, context: str | None = None) -> None:
        self._entries.appendleft(
            LogEntry(level=level.upper(), message=message, context=context)
        )

    def list(self, limit: int = 50) -> List[LogEntry]:
        return list(list(self._entries)[:limit])


log_store = LogStore()
