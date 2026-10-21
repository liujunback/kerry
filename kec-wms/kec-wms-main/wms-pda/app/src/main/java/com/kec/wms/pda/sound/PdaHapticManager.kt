package com.kec.wms.pda.sound

import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import com.kec.wms.pda.data.local.LoginPreferences
import com.kec.wms.pda.presentation.common.PdaSoundEvent
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class PdaHapticManager @Inject constructor(
    @ApplicationContext private val context: Context,
    private val loginPreferences: LoginPreferences
) {
    private val vibrator: Vibrator? by lazy {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val manager = context.getSystemService(VibratorManager::class.java)
            manager?.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
        }
    }

    fun vibrate(event: PdaSoundEvent) {
        if (!loginPreferences.isVibrationEnabledSync()) {
            return
        }

        val deviceVibrator = vibrator ?: return
        if (!deviceVibrator.hasVibrator()) {
            return
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val effect = when (event) {
                PdaSoundEvent.ScanSuccess -> oneShot(35)
                PdaSoundEvent.BusinessError -> waveform(longArrayOf(0, 40, 45, 40))
                PdaSoundEvent.SystemError -> waveform(longArrayOf(0, 70, 50, 70))
                PdaSoundEvent.ActionCompleted -> oneShot(60)
            }
            deviceVibrator.vibrate(effect)
        } else {
            @Suppress("DEPRECATION")
            when (event) {
                PdaSoundEvent.ScanSuccess -> deviceVibrator.vibrate(35)
                PdaSoundEvent.BusinessError -> deviceVibrator.vibrate(longArrayOf(0, 40, 45, 40), -1)
                PdaSoundEvent.SystemError -> deviceVibrator.vibrate(longArrayOf(0, 70, 50, 70), -1)
                PdaSoundEvent.ActionCompleted -> deviceVibrator.vibrate(60)
            }
        }
    }

    private fun oneShot(durationMs: Long): VibrationEffect {
        return VibrationEffect.createOneShot(durationMs, VibrationEffect.DEFAULT_AMPLITUDE)
    }

    private fun waveform(pattern: LongArray): VibrationEffect {
        return VibrationEffect.createWaveform(pattern, -1)
    }
}
