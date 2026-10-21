package com.kec.wms.pda.presentation.common

import androidx.compose.runtime.Immutable
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.update

@Immutable
data class PdaActionState(
    val phase: PdaActionPhase = PdaActionPhase.Idle
) {
    val isRunning: Boolean
        get() = phase == PdaActionPhase.Running

    companion object {
        val Idle = PdaActionState()
        val Running = PdaActionState(PdaActionPhase.Running)
        val Success = PdaActionState(PdaActionPhase.Success)
        val Error = PdaActionState(PdaActionPhase.Error)
    }
}

enum class PdaActionPhase {
    Idle,
    Running,
    Success,
    Error,
}

suspend fun <S, T> runPdaAction(
    stateFlow: MutableStateFlow<S>,
    onStart: (S) -> S,
    action: suspend () -> Result<T>,
    onSuccess: (S, T) -> S,
    onFailure: (S, Throwable) -> S,
    onSuccessEvent: (() -> Unit)? = null,
    onFailureEvent: ((Throwable) -> Unit)? = null,
): Result<T> {
    stateFlow.update(onStart)
    return action()
        .onSuccess { result ->
            stateFlow.update { current -> onSuccess(current, result) }
            onSuccessEvent?.invoke()
        }
        .onFailure { error ->
            stateFlow.update { current -> onFailure(current, error) }
            onFailureEvent?.invoke(error)
        }
}
