package com.kec.wms.pda.domain.usecase

import android.util.Log
import com.google.gson.Gson
import com.google.gson.JsonSyntaxException
import com.kec.wms.pda.data.model.LoginResponse
import com.kec.wms.pda.data.model.PdaLoginQrContent
import com.kec.wms.pda.data.repository.AuthRepository
import javax.inject.Inject

/**
 * 扫码登录用例
 * 解析二维码内容并执行令牌登录
 */
class QrCodeLoginUseCase @Inject constructor(
    private val authRepository: AuthRepository,
    private val gson: Gson
) {

    companion object {
        private const val TAG = "QrCodeLoginUseCase"
        private const val QR_TYPE_PDA_LOGIN = "PDA_LOGIN"
        private const val SUPPORTED_VERSION = 1
    }

    /**
     * 执行扫码登录
     * @param qrContent 二维码扫描得到的原始内容
     * @return Result<LoginResponse> - 登录结果（包含 token 和用户信息）
     */
    suspend operator fun invoke(qrContent: String): Result<LoginResponse> {
        Log.d(TAG, "开始解析二维码内容")

        // 验证输入
        if (qrContent.isBlank()) {
            return Result.failure(Exception("二维码内容为空"))
        }

        // 解析二维码内容
        val qrData = try {
            gson.fromJson(qrContent, PdaLoginQrContent::class.java)
        } catch (e: JsonSyntaxException) {
            Log.e(TAG, "二维码内容解析失败", e)
            return Result.failure(Exception("无效的二维码格式"))
        }

        // 验证二维码类型
        if (qrData.type != QR_TYPE_PDA_LOGIN) {
            Log.e(TAG, "不支持的二维码类型: ${qrData.type}")
            return Result.failure(Exception("不支持的二维码类型"))
        }

        // 验证版本
        if (qrData.version > SUPPORTED_VERSION) {
            Log.e(TAG, "不支持的二维码版本: ${qrData.version}")
            return Result.failure(Exception("请升级PDA应用以支持新版本二维码"))
        }

        // 验证令牌
        if (qrData.token.isBlank()) {
            return Result.failure(Exception("二维码中缺少登录令牌"))
        }

        Log.d(TAG, "二维码解析成功，开始令牌登录")

        // 调用Repository执行令牌登录
        return authRepository.tokenLogin(qrData.token)
    }
}
