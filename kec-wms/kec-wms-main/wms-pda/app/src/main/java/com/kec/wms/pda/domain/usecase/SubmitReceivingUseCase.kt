package com.kec.wms.pda.domain.usecase

import com.kec.wms.pda.data.model.ReceivingRequest
import com.kec.wms.pda.data.model.ReceivingResult
import com.kec.wms.pda.data.repository.AsnRepository
import javax.inject.Inject

/**
 * 提交收货用例
 * 封装收货提交业务逻辑
 */
class SubmitReceivingUseCase @Inject constructor(
    private val asnRepository: AsnRepository
) {

    /**
     * 执行收货提交
     * @param asnId ASN ID
     * @param request 收货请求
     * @return Result<ReceivingResult> - 收货结果
     */
    suspend operator fun invoke(
        asnId: String,
        request: ReceivingRequest
    ): Result<ReceivingResult> {
        // 验证输入
        if (request.receivedQty <= 0) {
            return Result.failure(Exception("收货数量必须大于0"))
        }

        // 调用Repository提交收货
        return asnRepository.submitReceiving(asnId, request)
    }
}
