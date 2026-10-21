package com.kec.wms.pda.data.local

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

/**
 * 登录信息持久化存储
 * 使用DataStore保存租户代码和用户名
 */
private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "login_preferences")

@Singleton
class LoginPreferences @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private object PreferencesKeys {
        val TENANT_CODE = stringPreferencesKey("tenant_code")
        val USERNAME = stringPreferencesKey("username")
        val REMEMBER_ME = booleanPreferencesKey("remember_me")
        val AUTH_TOKEN = stringPreferencesKey("auth_token")
        val PERMISSIONS = stringPreferencesKey("permissions")
        val USER_FULL_NAME = stringPreferencesKey("user_full_name")
        val USER_TENANT_NAME = stringPreferencesKey("user_tenant_name")
        val USER_ID = stringPreferencesKey("user_id")
        val USER_EMAIL = stringPreferencesKey("user_email")
        val USER_TYPE = stringPreferencesKey("user_type")
        val USER_TENANT_ID = stringPreferencesKey("user_tenant_id")
        val WAREHOUSE_ID = stringPreferencesKey("warehouse_id")
        val SOUND_ENABLED = booleanPreferencesKey("sound_enabled")
        val VIBRATION_ENABLED = booleanPreferencesKey("vibration_enabled")
        val THEME_ID = stringPreferencesKey("theme_id")
        val IGNORED_UPDATE_VERSION_CODE = intPreferencesKey("ignored_update_version_code")
    }

    /**
     * 保存登录信息
     */
    suspend fun saveLoginInfo(tenantCode: String, username: String, rememberMe: Boolean) {
        context.dataStore.edit { preferences ->
            if (rememberMe) {
                preferences[PreferencesKeys.TENANT_CODE] = tenantCode
                preferences[PreferencesKeys.USERNAME] = username
                preferences[PreferencesKeys.REMEMBER_ME] = true
            } else {
                // 如果不记住，清除保存的信息
                preferences.remove(PreferencesKeys.TENANT_CODE)
                preferences.remove(PreferencesKeys.USERNAME)
                preferences[PreferencesKeys.REMEMBER_ME] = false
            }
        }
    }

    /**
     * 获取保存的租户代码
     */
    val tenantCode: Flow<String> = context.dataStore.data.map { preferences ->
        preferences[PreferencesKeys.TENANT_CODE] ?: ""
    }

    /**
     * 获取保存的用户名
     */
    val username: Flow<String> = context.dataStore.data.map { preferences ->
        preferences[PreferencesKeys.USERNAME] ?: ""
    }

    /**
     * 获取保存的仓库ID
     */
    val warehouseId: Flow<String> = context.dataStore.data.map { preferences ->
        preferences[PreferencesKeys.WAREHOUSE_ID] ?: ""
    }

    /**
     * 获取"记住我"状态
     */
    val rememberMe: Flow<Boolean> = context.dataStore.data.map { preferences ->
        preferences[PreferencesKeys.REMEMBER_ME] ?: false
    }

    val soundEnabled: Flow<Boolean> = context.dataStore.data.map { preferences ->
        preferences[PreferencesKeys.SOUND_ENABLED] ?: true
    }

    val vibrationEnabled: Flow<Boolean> = context.dataStore.data.map { preferences ->
        preferences[PreferencesKeys.VIBRATION_ENABLED] ?: true
    }

    val themeId: Flow<String> = context.dataStore.data.map { preferences ->
        preferences[PreferencesKeys.THEME_ID] ?: "kerry_orange"
    }

    /**
     * 清除所有登录信息
     */
    suspend fun clearLoginInfo() {
        context.dataStore.edit { preferences ->
            preferences.remove(PreferencesKeys.TENANT_CODE)
            preferences.remove(PreferencesKeys.USERNAME)
            preferences[PreferencesKeys.REMEMBER_ME] = false
        }
    }

    /**
     * 保存认证 token
     */
    suspend fun saveToken(token: String) {
        context.dataStore.edit { preferences ->
            preferences[PreferencesKeys.AUTH_TOKEN] = token
        }
    }

    /**
     * 获取认证 token（同步方法）
     */
    fun getToken(): String? {
        // 注意：这是一个简化的同步实现
        // 在实际使用中，应该使用 Flow 或 suspend 函数
        return kotlinx.coroutines.runBlocking {
            context.dataStore.data.map { preferences ->
                preferences[PreferencesKeys.AUTH_TOKEN]
            }.first()  // 使用 first() 获取第一个值后立即返回
        }
    }

    /**
     * 清除认证 token 和权限
     */
    suspend fun clearToken() {
        context.dataStore.edit { preferences ->
            preferences.remove(PreferencesKeys.AUTH_TOKEN)
            preferences.remove(PreferencesKeys.PERMISSIONS)
            preferences.remove(PreferencesKeys.USER_FULL_NAME)
            preferences.remove(PreferencesKeys.USER_TENANT_NAME)
            preferences.remove(PreferencesKeys.USER_ID)
            preferences.remove(PreferencesKeys.USER_EMAIL)
            preferences.remove(PreferencesKeys.USER_TYPE)
            preferences.remove(PreferencesKeys.USER_TENANT_ID)
            preferences.remove(PreferencesKeys.WAREHOUSE_ID)
        }
    }

    suspend fun saveUserInfo(
        userId: String,
        username: String,
        fullName: String?,
        email: String?,
        tenantId: String?,
        tenantCode: String?,
        tenantName: String?,
        userType: String?
    ) {
        context.dataStore.edit { preferences ->
            preferences[PreferencesKeys.USER_ID] = userId
            preferences[PreferencesKeys.USERNAME] = username
            fullName?.let { preferences[PreferencesKeys.USER_FULL_NAME] = it }
            email?.let { preferences[PreferencesKeys.USER_EMAIL] = it }
            tenantId?.let { preferences[PreferencesKeys.USER_TENANT_ID] = it }
            tenantCode?.let { preferences[PreferencesKeys.TENANT_CODE] = it }
            tenantName?.let { preferences[PreferencesKeys.USER_TENANT_NAME] = it }
            userType?.let { preferences[PreferencesKeys.USER_TYPE] = it }
        }
    }

    suspend fun saveWarehouseId(warehouseId: String?) {
        context.dataStore.edit { preferences ->
            if (warehouseId.isNullOrBlank()) {
                preferences.remove(PreferencesKeys.WAREHOUSE_ID)
            } else {
                preferences[PreferencesKeys.WAREHOUSE_ID] = warehouseId
            }
        }
    }

    fun getWarehouseIdSync(): String {
        return kotlinx.coroutines.runBlocking {
            context.dataStore.data.map { preferences ->
                preferences[PreferencesKeys.WAREHOUSE_ID] ?: ""
            }.first()
        }
    }

    suspend fun saveSoundEnabled(enabled: Boolean) {
        context.dataStore.edit { preferences ->
            preferences[PreferencesKeys.SOUND_ENABLED] = enabled
        }
    }

    fun isSoundEnabledSync(): Boolean {
        return kotlinx.coroutines.runBlocking {
            context.dataStore.data.map { preferences ->
                preferences[PreferencesKeys.SOUND_ENABLED] ?: true
            }.first()
        }
    }

    suspend fun saveVibrationEnabled(enabled: Boolean) {
        context.dataStore.edit { preferences ->
            preferences[PreferencesKeys.VIBRATION_ENABLED] = enabled
        }
    }

    suspend fun saveThemeId(themeId: String) {
        context.dataStore.edit { preferences ->
            preferences[PreferencesKeys.THEME_ID] = themeId
        }
    }

    fun getThemeIdSync(): String {
        return kotlinx.coroutines.runBlocking {
            context.dataStore.data.map { preferences ->
                preferences[PreferencesKeys.THEME_ID] ?: "kerry_orange"
            }.first()
        }
    }

    suspend fun saveIgnoredUpdateVersionCode(versionCode: Int?) {
        context.dataStore.edit { preferences ->
            if (versionCode == null) {
                preferences.remove(PreferencesKeys.IGNORED_UPDATE_VERSION_CODE)
            } else {
                preferences[PreferencesKeys.IGNORED_UPDATE_VERSION_CODE] = versionCode
            }
        }
    }

    fun getIgnoredUpdateVersionCodeSync(): Int? {
        return kotlinx.coroutines.runBlocking {
            context.dataStore.data.map { preferences ->
                preferences[PreferencesKeys.IGNORED_UPDATE_VERSION_CODE]
            }.first()
        }
    }

    fun isVibrationEnabledSync(): Boolean {
        return kotlinx.coroutines.runBlocking {
            context.dataStore.data.map { preferences ->
                preferences[PreferencesKeys.VIBRATION_ENABLED] ?: true
            }.first()
        }
    }

    fun getSavedUserInfo(): SavedUserInfo? {
        return kotlinx.coroutines.runBlocking {
            context.dataStore.data.map { preferences ->
                val token = preferences[PreferencesKeys.AUTH_TOKEN]
                val username = preferences[PreferencesKeys.USERNAME]

                if (token != null && username != null) {
                    SavedUserInfo(
                        userId = preferences[PreferencesKeys.USER_ID] ?: "",
                        username = username,
                        fullName = preferences[PreferencesKeys.USER_FULL_NAME],
                        email = preferences[PreferencesKeys.USER_EMAIL],
                        tenantId = preferences[PreferencesKeys.USER_TENANT_ID],
                        tenantCode = preferences[PreferencesKeys.TENANT_CODE],
                        tenantName = preferences[PreferencesKeys.USER_TENANT_NAME],
                        userType = preferences[PreferencesKeys.USER_TYPE],
                        warehouseId = preferences[PreferencesKeys.WAREHOUSE_ID]
                    )
                } else {
                    null
                }
            }.first()
        }
    }

    /**
     * 保存权限列表（逗号分隔字符串）
     */
    suspend fun savePermissions(permissions: List<String>) {
        val normalizedPermissions = permissions
            .map { it.trim() }
            .filter { it.isNotEmpty() }
            .distinct()

        context.dataStore.edit { preferences ->
            preferences[PreferencesKeys.PERMISSIONS] = normalizedPermissions.joinToString(",")
        }
    }

    /**
     * 获取权限列表（同步方法）
     */
    fun getPermissionsSync(): List<String> {
        return kotlinx.coroutines.runBlocking {
            context.dataStore.data.map { preferences ->
                val raw = preferences[PreferencesKeys.PERMISSIONS] ?: ""
                if (raw.isEmpty()) {
                    emptyList()
                } else {
                    raw.split(",")
                        .map { it.trim() }
                        .filter { it.isNotEmpty() }
                        .distinct()
                }
            }.first()
        }
    }
}

data class SavedUserInfo(
    val userId: String,
    val username: String,
    val fullName: String?,
    val email: String?,
    val tenantId: String?,
    val tenantCode: String?,
    val tenantName: String?,
    val userType: String?,
    val warehouseId: String?
)
