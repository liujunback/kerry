package com.kec.wms.pda.domain.usecase

import com.kec.wms.pda.data.repository.AuthRepository
import javax.inject.Inject

/**
 * 权限查询用例
 * 提供权限的本地缓存读取、服务器刷新和单个权限检查能力
 */
class GetPermissionsUseCase @Inject constructor(
    private val authRepository: AuthRepository
) {

    /**
     * 从本地缓存读取权限列表
     */
    fun getCachedPermissions(): List<String> {
        return authRepository.getPermissions()
    }

    /**
     * 从服务器刷新权限并保存到本地
     */
    suspend fun refreshPermissions() {
        authRepository.fetchAndSavePermissions()
    }

    /**
     * 检查是否拥有指定权限
     */
    fun hasPermission(permission: String): Boolean {
        return getCachedPermissions().contains(permission)
    }
}
