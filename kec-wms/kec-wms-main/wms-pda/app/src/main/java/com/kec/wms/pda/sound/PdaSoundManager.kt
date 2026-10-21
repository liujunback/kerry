package com.kec.wms.pda.sound

import android.media.AudioManager
import android.media.ToneGenerator
import com.kec.wms.pda.data.local.LoginPreferences
import com.kec.wms.pda.presentation.common.PdaSoundEvent
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class PdaSoundManager @Inject constructor(
    private val loginPreferences: LoginPreferences
) {
    private val toneGenerator by lazy {
        ToneGenerator(AudioManager.STREAM_MUSIC, 80)
    }

    fun play(event: PdaSoundEvent) {
        if (!loginPreferences.isSoundEnabledSync()) {
            return
        }

        val (tone, durationMs) = when (event) {
            PdaSoundEvent.ScanSuccess -> ToneGenerator.TONE_PROP_BEEP to 120
            PdaSoundEvent.BusinessError -> ToneGenerator.TONE_PROP_NACK to 180
            PdaSoundEvent.SystemError -> ToneGenerator.TONE_SUP_ERROR to 250
            PdaSoundEvent.ActionCompleted -> ToneGenerator.TONE_PROP_ACK to 220
        }

        toneGenerator.startTone(tone, durationMs)
    }
}
