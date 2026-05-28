from fastapi import APIRouter, Depends, Request

from auth.jwt import get_current_user, require_admin
from kafka.dead_letter import DeadLetterQueue


router = APIRouter()


def get_dead_letter_queue(request: Request) -> DeadLetterQueue:
    return request.app.state.dead_letter_queue


@router.get("")
def list_deadletter(
    current_user: dict = Depends(get_current_user),
    dlq: DeadLetterQueue = Depends(get_dead_letter_queue),
) -> list[dict]:
    return dlq.list()


@router.get("/{message_id}")
def get_deadletter_message(
    message_id: str,
    current_user: dict = Depends(get_current_user),
    dlq: DeadLetterQueue = Depends(get_dead_letter_queue),
) -> dict:
    return dlq.get(message_id)


@router.post("/{message_id}/retry")
def retry_deadletter_message(
    message_id: str,
    admin: dict = Depends(require_admin),
    dlq: DeadLetterQueue = Depends(get_dead_letter_queue),
) -> dict:
    return dlq.retry(message_id)


@router.delete("/{message_id}")
def discard_deadletter_message(
    message_id: str,
    admin: dict = Depends(require_admin),
    dlq: DeadLetterQueue = Depends(get_dead_letter_queue),
) -> dict:
    return dlq.discard(message_id)
