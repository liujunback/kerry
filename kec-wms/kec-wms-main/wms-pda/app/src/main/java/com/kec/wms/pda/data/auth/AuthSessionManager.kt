package com.kec.wms.pda.data.auth

import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import javax.inject.Inject
import javax.inject.Singleton

sealed interface AuthSessionEvent {
    object SessionExpired : AuthSessionEvent
}

@Singleton
class AuthSessionManager @Inject constructor() {
    private val _events = MutableSharedFlow<AuthSessionEvent>(extraBufferCapacity = 1)
    val events: SharedFlow<AuthSessionEvent> = _events.asSharedFlow()

    fun notifySessionExpired() {
        _events.tryEmit(AuthSessionEvent.SessionExpired)
    }
}
