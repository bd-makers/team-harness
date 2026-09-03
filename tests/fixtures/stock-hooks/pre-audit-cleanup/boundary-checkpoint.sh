#!/bin/sh
# PreToolUse hook: active task plan의 checkbox를 완료로 바꾸기 직전에
# 선언된 JSON Schema boundary를 결정론적으로 대조한다.
# stdin의 tool input은 단일 Node CLI process가 읽어 fast path를 유지한다.
# Exit 0 = 허용, Exit 2 = edit 차단.

exec "${HARNESS_TEAM_BIN:-harness-team}" boundary checkpoint
