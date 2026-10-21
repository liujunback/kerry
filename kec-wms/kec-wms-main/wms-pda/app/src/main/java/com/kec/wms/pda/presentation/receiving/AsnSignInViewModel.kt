package com.kec.wms.pda.presentation.receiving

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.kec.wms.pda.R
import com.kec.wms.pda.data.model.AsnDetail
import com.kec.wms.pda.domain.usecase.SignInAsnUseCase
import com.kec.wms.pda.presentation.common.PdaSoundEvent
import com.kec.wms.pda.presentation.common.PdaUiEvent
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class AsnSignInUiState(
    val isSubmitting: Boolean = false,
    val error: String? = null,
    val successMessage: String? = null,
    val signedAsn: AsnDetail? = null
)

@HiltViewModel
class AsnSignInViewModel @Inject constructor(
    private val signInAsnUseCase: SignInAsnUseCase,
    @ApplicationContext private val context: Context
) : ViewModel() {

    private val _uiState = MutableStateFlow(AsnSignInUiState())
    val uiState: StateFlow<AsnSignInUiState> = _uiState.asStateFlow()
    private val _uiEvents = MutableSharedFlow<PdaUiEvent>(extraBufferCapacity = 1)
    val uiEvents: SharedFlow<PdaUiEvent> = _uiEvents.asSharedFlow()

    fun signInAsn(asnNumber: String) {
        val normalizedAsn = asnNumber.trim()
        val currentState = _uiState.value
        if (currentState.isSubmitting) {
            return
        }

        _uiState.update {
            it.copy(
                isSubmitting = true,
                error = null,
                successMessage = null,
                signedAsn = null
            )
        }

        viewModelScope.launch {
            signInAsnUseCase(normalizedAsn)
                .onSuccess { asn ->
                    _uiState.update {
                        it.copy(
                            isSubmitting = false,
                            error = null,
                            successMessage = context.getString(
                                R.string.asn_sign_in_success_format,
                                asn.asnNumber
                            ),
                            signedAsn = asn
                        )
                    }
                    _uiEvents.tryEmit(PdaUiEvent.PlaySound(PdaSoundEvent.ScanSuccess))
                }
                .onFailure { error ->
                    _uiState.update {
                        it.copy(
                            isSubmitting = false,
                            error = error.message ?: context.getString(R.string.asn_sign_in_failed),
                            successMessage = null,
                            signedAsn = null
                        )
                    }
                    _uiEvents.tryEmit(
                        PdaUiEvent.PlaySound(resolveErrorSound(error.message))
                    )
                }
        }
    }

    fun finishSignInFlow() {
        _uiState.update {
            it.copy(
                isSubmitting = false,
                error = null,
                successMessage = null,
                signedAsn = null
            )
        }
    }

    private fun resolveErrorSound(message: String?): PdaSoundEvent {
        val normalized = message.orEmpty()
        return if (
            normalized.contains("超时") ||
            normalized.contains("无法连接") ||
            normalized.contains("Unauthorized", ignoreCase = true) ||
            normalized.contains("登录")
        ) {
            PdaSoundEvent.SystemError
        } else {
            PdaSoundEvent.BusinessError
        }
    }
}
