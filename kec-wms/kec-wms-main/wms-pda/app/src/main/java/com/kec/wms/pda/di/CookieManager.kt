package com.kec.wms.pda.di

import android.content.Context
import com.franmontiel.persistentcookiejar.PersistentCookieJar
import com.franmontiel.persistentcookiejar.cache.SetCookieCache
import com.franmontiel.persistentcookiejar.persistence.SharedPrefsCookiePersistor
import dagger.hilt.android.qualifiers.ApplicationContext
import okhttp3.CookieJar
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Cookie管理器
 * 用于持久化NextAuth的session cookie
 */
@Singleton
class CookieManager @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val cookieJar: PersistentCookieJar = PersistentCookieJar(
        SetCookieCache(),
        SharedPrefsCookiePersistor(context)
    )

    fun getCookieJar(): CookieJar = cookieJar

    fun clearCookies() {
        cookieJar.clear()
    }
}
