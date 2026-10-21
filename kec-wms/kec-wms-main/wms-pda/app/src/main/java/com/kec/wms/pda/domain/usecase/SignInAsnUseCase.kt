package com.kec.wms.pda.domain.usecase

import android.content.Context
import com.kec.wms.pda.R
import com.kec.wms.pda.data.model.AsnDetail
import com.kec.wms.pda.data.repository.AsnRepository
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject

class SignInAsnUseCase @Inject constructor(
    private val asnRepository: AsnRepository,
    @ApplicationContext private val context: Context
) {
    suspend operator fun invoke(asnNumber: String): Result<AsnDetail> {
        if (asnNumber.isBlank()) {
            return Result.failure(Exception(context.getString(R.string.asn_sign_in_asn_required)))
        }

        return asnRepository.signInAsn(asnNumber.trim())
    }
}
