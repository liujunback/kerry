package com.kec.wms.pda.domain.usecase

import com.kec.wms.pda.data.model.LoginResponse
import com.kec.wms.pda.data.repository.AuthRepository
import javax.inject.Inject

/**
 * 登录用例
 * 封装登录业务逻辑
 */
class LoginUseCase @Inject constructor(
    private val authRepository: AuthRepository
) {

    /**
     * 执行登录
     * @param tenantCode 租户编码
     * @param username 用户名
     * @param password 密码
     * @return Result<LoginResponse> - 登录结果（包含 token 和用户信息）
     */
    suspend operator fun invoke(
        tenantCode: String,
        username: String,
        password: String
    ): Result<LoginResponse> {
        // 验证输入
        if (tenantCode.isBlank()) {
            return Result.failure(Exception("租户编码不能为空"))
        }
        if (username.isBlank()) {
            return Result.failure(Exception("用户名不能为空"))
        }
        if (password.isBlank()) {
            return Result.failure(Exception("密码不能为空"))
        }

        // 调用Repository执行登录
        return authRepository.login(tenantCode, username, password)
    }
}
