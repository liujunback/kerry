package com.kec.wms.pda.domain.usecase

import android.content.Context
import com.kec.wms.pda.R
import com.kec.wms.pda.data.model.AsnDetail
import com.kec.wms.pda.data.repository.AsnRepository
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject

/**
 * 加载ASN用例
 * 封装ASN查询业务逻辑
 */
class LoadAsnUseCase @Inject constructor(
    private val asnRepository: AsnRepository,
    @ApplicationContext private val context: Context
) {

    /**
     * 执行ASN查询
     * @param asnNumber ASN单号
     * @param receivingMode 收货模式
     * @return Result<AsnDetail> - ASN详情
     */
    suspend operator fun invoke(asnNumber: String, receivingMode: String): Result<AsnDetail> {
        // 验证输入
        if (asnNumber.isBlank()) {
            return Result.failure(Exception(context.getString(R.string.asn_sign_in_asn_required)))
        }

        // 调用Repository查询ASN
        return asnRepository.lookupAsn(asnNumber.trim(), receivingMode)
    }
}
