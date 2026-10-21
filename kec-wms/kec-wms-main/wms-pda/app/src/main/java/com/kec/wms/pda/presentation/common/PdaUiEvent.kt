package com.kec.wms.pda.presentation.common

sealed interface PdaUiEvent {
    data class PlaySound(val event: PdaSoundEvent) : PdaUiEvent
}

enum class PdaSoundEvent {
    ScanSuccess,
    BusinessError,
    SystemError,
    ActionCompleted,
}
